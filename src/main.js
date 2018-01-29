import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';
import 'spinkit/css/spinners/11-folding-cube.css';

import _ from 'lodash';

import { $, $all } from './helpers';
import { catchErrors } from './errors';
import { ErrorDialog } from './dialogs/error-dialog';
import { signIn, signOut, isSignedIn, getUpcomingManageableCompetitions, getCompetitionWcif, saveCompetitionEventsWcif } from './wca-api';
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
  getUpcomingManageableCompetitions()
    .then(competitions => {
      $('#competition-select').innerHTML = '';
      competitions.reverse().forEach(competition => {
        const option = document.createElement('option');
        option.value = JSON.stringify(competition);
        option.innerText = competition.short_name;
        $('#competition-select').appendChild(option);
      });
      $('#competition-select').dispatchEvent(new Event('change'))
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
  const skipNewcomers = $('#skip-newcomers-input').checked;
  const judgeOwnEventsOnly = $('#judge-own-events-only-input').checked;
  const askForScramblers = $('#ask-for-scramblers-input').checked;
  /* People that shouldn't be assigned tasks. */
  const wcaIdsToSkip = [];
  skipNewcomers && wcaIdsToSkip.push("");
  if (skipManagers) {
    const competitionManagerWcaIds = _.map(_.concat(competitionJson.delegates, competitionJson.organizers), 'wca_id')
    wcaIdsToSkip.push(..._.uniq(_.compact(competitionManagerWcaIds)));
  }
  /* Main logic. */
  Promise.all([
    peopleFromCsvFile(registrationsFile).then(peopleWithWcaData),
    getCompetitionWcif(competitionJson.id)
  ])
  .then(([people, wcif]) => {
    const eventsWithData = assignGroups(people, stationsCount, sortByResults, sideEventsByMainEvents());
    return assignScrambling(eventsWithData, scramblersCount, askForScramblers, wcaIdsToSkip).then(() => {
      assignJudging(people, eventsWithData, stationsCount, staffJudgesCount, wcaIdsToSkip, judgeOwnEventsOnly);
      setScrambleGroupsCount && setWcifScrambleGroupsCount(wcif, eventsWithData, stationsCount);
      return Promise.all([
        setScrambleGroupsCount && saveCompetitionEventsWcif(wcif),
        ..._.invokeMap([
          new ScorecardsPdf(eventsWithData, wcif),
          new PersonalCardsPdf(people),
          new SummaryPdf(eventsWithData)
        ], 'download')
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
