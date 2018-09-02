import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';
import 'spinkit/css/spinners/11-folding-cube.css';

import _ from 'lodash';

import { $, $all, downloadAsJSON } from './helpers';
import { catchErrors } from './errors';
import { ErrorDialog } from './dialogs/error-dialog';
import { ScorecardsDialog } from './dialogs/scorecards-dialog';
import { signIn, signOut, isSignedIn, getUpcomingManageableCompetitions, getCompetitionWcif, saveCompetitionEventsWcif } from './wca-api';
import { getCompetitionsInProgress, getCompetitionEvents } from './cubecomps-api';
import { validateEventsWcif, eventObjects } from './events';
import { peopleFromCsvFile, peopleWithWcaData } from './people';
import { assignGroups, assignScrambling, assignJudging, setWcifScrambleGroupsCount } from './groups-assignment';
import { ScorecardsPdf } from './pdfs/scorecards-pdf';
import { PersonalCardsPdf } from './pdfs/personal-cards-pdf';
import { SummaryPdf } from './pdfs/summary-pdf';
import { sideEventsByMainEvents } from './simultaneous-events';

const errorHandlers = catchErrors({
  CsvParsingError: () => new ErrorDialog().showError('Failed to parse the given CSV file.'),
  WcaApiError: error => new ErrorDialog().showError(error.data.message),
  AbortError: () => {},
  IncompleteWcifError: error => new ErrorDialog().showError(`Incomplete WCIF: ${error.data.message}`),
  default: () => new ErrorDialog().showError('Something went wrong.')
});

if (isSignedIn()) {
  document.body.classList.add('user-signed-in');
  Promise.all([
    getUpcomingManageableCompetitions(),
    getCompetitionsInProgress()
  ]).then(([wcaCompetitions, ccCompetitions]) => {
      /* Add options to the competition select. */
      $('#competition-select').innerHTML = '';
      wcaCompetitions.reverse().forEach(competition => {
        const option = document.createElement('option');
        option.value = JSON.stringify(competition);
        option.innerText = competition.short_name;
        $('#competition-select').appendChild(option);
      });
      $('#competition-select').dispatchEvent(new Event('change'))
      /* If one of the manageable competitions is ongoing on Cubecomps,
         show a dialog for printing scorecards for subsequent rounds. */
      const competitionsPair = ccCompetitions
        .map(ccCompetition => {
          const wcaCompetition = wcaCompetitions.find(wcaCompetition =>
            wcaCompetition.name.startsWith(ccCompetition.name)
          );
          return wcaCompetition ? [ccCompetition, wcaCompetition] : null;
        })
        .find(pair => pair !== null);
      if (competitionsPair) {
        const [ccCompetition, wcaCompetition] = competitionsPair;
        Promise.all([
          getCompetitionEvents(ccCompetition.id),
          getCompetitionWcif(wcaCompetition.id)
        ]).then(([ccEvents, wcif]) => {
          const ccRounds = _.compact(ccEvents.map(ccEvent => {
            const eventObject = _.find(eventObjects, { name: ccEvent.name });
            const subsequentRounds = _.sortBy(ccEvent.rounds, 'id').slice(1);
            const nextRound = _(subsequentRounds).filter({ finished: false, live: false }).minBy('id');
            if (nextRound) {
              const previousRound = ccEvent.rounds.find(ccRound =>
                parseInt(ccRound.id, 10) === parseInt(nextRound.id, 10) - 1
              );
              if (previousRound.finished) {
                nextRound.eventObject = eventObject;
                return nextRound;
              }
            }
          }));
          if (ccRounds.length > 0) {
            new ScorecardsDialog(ccCompetition, ccRounds, wcif).show();
          }
        });
      }
    })
    .catch(errorHandlers);
}

$('#sign-in-link').addEventListener('click', event => {
  event.preventDefault();
  signIn();
});

$('#sign-out-link').addEventListener('click', event => {
  event.preventDefault();
  signOut();
  document.body.classList.remove('user-signed-in');
});

const loadingScreen = shown => document.body.classList.toggle('loading', shown);

$('#generate').addEventListener('click', () => {
  loadingScreen(true);
  const competitionJson = JSON.parse($('#competition-select').value);
  const registrationsFile = $('#file-input').files[0];
  const stationsCount = parseInt($('#stations-input').value);
  const scramblersCount = parseInt($('#scramblers-input').value);
  const staffJudgesCount = parseInt($('#staff-judges-input').value);
  const sortByResults = $('#sort-by-results-input').checked;
  const setScrambleGroupsCount = $('#set-scramble-groups-count-input').checked;
  const skipManagers = $('#skip-managers-input').checked;
  const skipYoungs = $('#skip-youngs-input').checked;
  const tasksMinAge = skipYoungs ? parseInt($('#tasks-min-age-input').value) : 0;
  const skipNewcomers = $('#skip-newcomers-input').checked;
  const judgeOwnEventsOnly = $('#judge-own-events-only-input').checked;
  const askForScramblers = $('#ask-for-scramblers-input').checked;
  const preferLocalNames = $('#prefer-local-names-input').checked;
  const exportJson = $('#export-json-input').checked;
  /* People that shouldn't be assigned tasks. */
  const wcaIdsToSkip = [];
  skipNewcomers && wcaIdsToSkip.push("");
  if (skipManagers) {
    const competitionManagerWcaIds = _.map(_.concat(competitionJson.delegates, competitionJson.organizers), 'wca_id')
    wcaIdsToSkip.push(..._.uniq(_.compact(competitionManagerWcaIds)));
  }
  /* Main logic. */
  Promise.all([
    peopleFromCsvFile(registrationsFile, preferLocalNames).then(peopleWithWcaData),
    getCompetitionWcif(competitionJson.id)
  ])
  .then(([people, wcif]) => {
    const csvEventIds = _.uniq(_.flatMap(people, 'events'));
    validateEventsWcif(wcif, csvEventIds);
    /* Assign groups, scramblers and judges. Generate PDFs. */
    const eventsWithData = assignGroups(people, stationsCount, sortByResults, sideEventsByMainEvents());
    return assignScrambling(eventsWithData, scramblersCount, askForScramblers, wcaIdsToSkip, tasksMinAge).then(() => {
      assignJudging(people, eventsWithData, stationsCount, staffJudgesCount, wcaIdsToSkip, judgeOwnEventsOnly, tasksMinAge);
      setScrambleGroupsCount && setWcifScrambleGroupsCount(wcif, eventsWithData, stationsCount);
      exportJson && downloadAsJSON(
        _.map(people, person => _.pick(person, ['id', 'name', 'wcaId', 'solving', 'scrambling', 'judging'])),
        'people.json'
      );
      return Promise.all([
        setScrambleGroupsCount && saveCompetitionEventsWcif(wcif),
        /* PDFs are generated synchronously, so there's no point in invoking all `download`s at once.
           Doing so makes the user wait long and save everything at once at the end
           (seems like the browser is too busy to show the save dialog).
           Instead, if we call `download` one by one
           then the user can save each file as soon as it's ready. */
        [
          new SummaryPdf(eventsWithData),
          new PersonalCardsPdf(people),
          new ScorecardsPdf(eventsWithData, wcif),
        ].reduce((promise, pdf) => promise.then(() => pdf.download()), Promise.resolve())
      ]);
    });
  })
  .catch(errorHandlers)
  .then(() => loadingScreen(false));
});

/* Form initialization */

const controlsByEvent = {
  input: _.toArray($all('form input[type="text"]')),
  change: [$('#competition-select')]
};

/* Enable/disable the button depending on the form validity. */
const updateButtonState = () => {
  $('#generate').disabled = !_.flatMap(controlsByEvent).every(control => control.value && control.validity.valid);
};

_.each(controlsByEvent, (controls, eventName) => {
  controls.forEach(element => {
    element.addEventListener(eventName, () => {
      element.required = true; /* Setting this sooner results in validation messages shown on the page load. See: https://github.com/google/material-design-lite/issues/1502 */
      updateButtonState();
    });
  });
});

/* Show the selected filename within the corresponding text input. */
$('#file-input').addEventListener('change', event => {
  const fileNameInput = $('#file-name-input');
  fileNameInput.value = event.target.files[0].name;
  fileNameInput.parentNode.MaterialTextfield.checkDirty();
  fileNameInput.parentNode.MaterialTextfield.checkValidity();
  updateButtonState();
});

/* Show feature toast 1s after the page loads. */
setTimeout(() => {
  $('#feature-toast').MaterialSnackbar.showSnackbar({
    message: 'Come back here during the competition and print scorecards for subsequent rounds easily! \uD83C\uDF89',
    timeout: 10000,
    actionHandler: () => $('#feature-toast').classList.remove('mdl-snackbar--active'),
    actionText: 'Ok'
  });
}, 1000);
