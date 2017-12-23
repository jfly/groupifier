
import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';

import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { signIn, signOut, isSignedIn, getUpcomingManageableCompetitions, getCompetitionWcif } from './wca-api';
import { peopleFromCsvRows, attachWcaDataToPeople } from './people';
import { assignGroups, assignScrambling, assignJudging } from './groups-assignment';
import { createPersonalCardsPdf, createSummaryPdf, createScorecardsPdf } from './pdf-creation';
import { sideEventsByMainEvents } from './simultaneous-events';

const signInLink = document.getElementById('sign-in-link');
const signOutLink = document.getElementById('sign-out-link');
const competitionIdSelect = document.getElementById('competition-id-select');
const fileNameInput = document.getElementById('file-name-input');
const fileInput = document.getElementById('file-input');
const stationsInput = document.getElementById('stations-input');
const scramblersInput = document.getElementById('scramblers-input');
const staffJudgesInput = document.getElementById('staff-judges-input');
const sortByResultsInput = document.getElementById('sort-by-results-input');
const askForScramblersInput = document.getElementById('ask-for-scramblers-input');
const skipNewcomersInput = document.getElementById('skip-newcomers-input');
const button = document.getElementById('generate');

/* Show the selected file name within the appropriate input. */
fileInput.addEventListener('change', event => {
  fileNameInput.value = event.target.files[0].name;
  fileNameInput.parentNode.MaterialTextfield.checkDirty();
  fileNameInput.parentNode.MaterialTextfield.checkValidity();
  updateButtonState();
});

/* Enable/disable the button depending on the form validity. */
const controlsByEvent = {
  input: _.toArray(document.querySelectorAll('input[type="text"]')),
  change: [competitionIdSelect]
};
_.each(controlsByEvent, (controls, eventName) => {
  controls.forEach(element => {
    element.addEventListener(eventName, () => {
      element.required = true; /* Setting this sooner results in validation messages shown on the page load. See: https://github.com/google/material-design-lite/issues/1502 */
      updateButtonState();
    });
  });
});

function updateButtonState() {
  button.disabled = !_.flatMap(controlsByEvent).every(control => control.value && control.validity.valid);
}

button.addEventListener('click', () => {
  const competitionId = competitionIdSelect.value;
  const stationsCount = parseInt(stationsInput.value);
  const scramblersCount = parseInt(scramblersInput.value);
  const staffJudgesCount = parseInt(staffJudgesInput.value);
  const sortByResults = sortByResultsInput.checked;
  const askForScramblers = askForScramblersInput.checked;
  const skipNewcomers = skipNewcomersInput.checked;
  parseCSV(fileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: ({ data: rows }) => {
      const people = peopleFromCsvRows(rows);
      Promise.all([getCompetitionWcif(competitionIdSelect.value), attachWcaDataToPeople(people)]).then(([wcif]) => {
        const eventsWithData = assignGroups(people, stationsCount, sortByResults, sideEventsByMainEvents());
        assignScrambling(eventsWithData, scramblersCount, askForScramblers, skipNewcomers).then(() => {
          assignJudging(people, eventsWithData, stationsCount, staffJudgesCount, skipNewcomers);
          createPersonalCardsPdf(people).open();
          createSummaryPdf(eventsWithData).open();
          createScorecardsPdf(eventsWithData, wcif).open();
        });
      });
    }
  });
});

signInLink.addEventListener('click', event => {
  event.preventDefault();
  signIn();
});

signOutLink.addEventListener('click', event => {
  event.preventDefault();
  signOut();
  document.body.classList.remove('user-signed-in');
});

if (isSignedIn()) {
  document.body.classList.add('user-signed-in');
  getUpcomingManageableCompetitions().then(competitions => {
    const competitionOptions = competitions.reverse().map(competition => `<option value="${competition.id}">${competition.short_name}</option>`);
    competitionIdSelect.innerHTML = competitionOptions.join('\n');
    competitionIdSelect.dispatchEvent(new Event('change'))
  });
}
