import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';

import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { peopleFromCsvRows, attachWcaDataToPeople } from './people';
import { assignGroups, assignScrambling, assignJudging } from './groups-assignment';
import { createPersonalCardsPdf, createSummaryPdf, createScorecardsPdf } from './pdf-creation';
import { sideEventsByMainEvents } from './simultaneous-events';

const fileNameInput = document.getElementById('file-name-input');
const fileInput = document.getElementById('file-input');
const competitionNameInput = document.getElementById('competition-name-input');
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
const inputs = _.toArray(document.querySelectorAll('input[type="text"]'));
inputs.forEach(element => {
  element.addEventListener('input', () => {
    element.required = true; /* Setting this sooner results in validation messages shown on the page load. See: https://github.com/google/material-design-lite/issues/1502 */
    updateButtonState();
  });
});

function updateButtonState() {
  button.disabled = !inputs.every(input => input.value && input.validity.valid);
}

button.addEventListener('click', () => {
  const competitionName = competitionNameInput.value;
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
      attachWcaDataToPeople(people).then(() => {
        const eventsWithData = assignGroups(people, stationsCount, sortByResults, sideEventsByMainEvents());
        assignScrambling(eventsWithData, scramblersCount, askForScramblers, skipNewcomers).then(() => {
          assignJudging(people, eventsWithData, stationsCount, staffJudgesCount, skipNewcomers);
          createPersonalCardsPdf(people).open();
          createSummaryPdf(eventsWithData).open();
          createScorecardsPdf(eventsWithData, competitionName).open();
        });
      });
    }
  });
});
