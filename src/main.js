import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';
import 'spinkit/css/spinners/11-folding-cube.css';

import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { $, $all } from './helpers';
import { signIn, signOut, isSignedIn, getUpcomingManageableCompetitions, getCompetitionWcif } from './wca-api';
import { peopleFromCsvRows, attachWcaDataToPeople } from './people';
import { assignGroups, assignScrambling, assignJudging } from './groups-assignment';
import { createPersonalCardsPdf, createSummaryPdf, createScorecardsPdf } from './pdf-creation';
import { sideEventsByMainEvents } from './simultaneous-events';

/* Show the selected file name within the appropriate input. */
$('#file-input').addEventListener('change', event => {
  const fileNameInput = $('#file-name-input');
  fileNameInput.value = event.target.files[0].name;
  fileNameInput.parentNode.MaterialTextfield.checkDirty();
  fileNameInput.parentNode.MaterialTextfield.checkValidity();
  updateButtonState();
});

const controlsByEvent = {
  input: _.toArray($all('form input[type="text"]')),
  change: [$('#competition-id-select')]
};
_.each(controlsByEvent, (controls, eventName) => {
  controls.forEach(element => {
    element.addEventListener(eventName, () => {
      element.required = true; /* Setting this sooner results in validation messages shown on the page load. See: https://github.com/google/material-design-lite/issues/1502 */
      updateButtonState();
    });
  });
});

/* Enable/disable the button depending on the form validity. */
function updateButtonState() {
  $('#generate').disabled = !_.flatMap(controlsByEvent).every(control => control.value && control.validity.valid);
}

function loadingScreen(shown) {
  document.body.classList.toggle('loading', shown);
}

$('#generate').addEventListener('click', () => {
  loadingScreen(true);
  const competitionId = $('#competition-id-select').value;
  const stationsCount = parseInt($('#stations-input').value);
  const scramblersCount = parseInt($('#scramblers-input').value);
  const staffJudgesCount = parseInt($('#staff-judges-input').value);
  const sortByResults = $('#sort-by-results-input').checked;
  const askForScramblers = $('#ask-for-scramblers-input').checked;
  const skipNewcomers = $('#skip-newcomers-input').checked;
  parseCSV($('#file-input').files[0], {
    header: true,
    skipEmptyLines: true,
    complete: ({ data: rows }) => {
      const people = peopleFromCsvRows(rows);
      Promise.all([getCompetitionWcif($('#competition-id-select').value), attachWcaDataToPeople(people)]).then(([wcif]) => {
        const eventsWithData = assignGroups(people, stationsCount, sortByResults, sideEventsByMainEvents());
        return assignScrambling(eventsWithData, scramblersCount, askForScramblers, skipNewcomers).then(() => {
          assignJudging(people, eventsWithData, stationsCount, staffJudgesCount, skipNewcomers);
          return Promise.all([
            new Promise(resolve => createPersonalCardsPdf(people).download('personal-cards.pdf', resolve)),
            new Promise(resolve => createSummaryPdf(eventsWithData).download('summary.pdf', resolve)),
            new Promise(resolve => createScorecardsPdf(eventsWithData, wcif).download('scorecards.pdf', resolve))
          ]);
        });
      })
      .then(() => loadingScreen(false), () => loadingScreen(false));
    }
  });
});

$('#sign-in-link').addEventListener('click', event => {
  event.preventDefault();
  signIn();
});

$('#sign-out-link').addEventListener('click', event => {
  event.preventDefault();
  signOut();
  document.body.classList.remove('user-signed-in');
});

if (isSignedIn()) {
  document.body.classList.add('user-signed-in');
  getUpcomingManageableCompetitions().then(competitions => {
    const competitionOptions = competitions.reverse().map(competition => `<option value="${competition.id}">${competition.short_name}</option>`);
    $('#competition-id-select').innerHTML = competitionOptions.join('\n');
    $('#competition-id-select').dispatchEvent(new Event('change'))
  });
}
