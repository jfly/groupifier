import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import '../assets/main.css';

import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { eventObjects } from './events';
import { assignGroups } from './groups-assignment';
import { createPersonalCardsPdf, createSummaryPdf } from './pdf-creation';

const fileNameInput = document.getElementById('file-name-input');
const fileInput = document.getElementById('file-input');
const stationsInput = document.getElementById('stations-input');
const scramblersInput = document.getElementById('scramblers-input');
const externalJudgesInput = document.getElementById('external-judges-input');
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
  const stationsCount = parseInt(stationsInput.value);
  const scramblersCount = parseInt(scramblersInput.value);
  const externalJudgesCount = parseInt(externalJudgesInput.value);
  const skipNewcomers = skipNewcomersInput.checked;
  parseCSV(fileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: ({ data: rows }) => {
      const people = peopleFromCsvRows(rows);
      const groupsByEvent = assignGroups(people, scramblersCount, stationsCount, externalJudgesCount, skipNewcomers);
      createPersonalCardsPdf(people).open();
      createSummaryPdf(groupsByEvent).open();
    }
  });
});

function peopleFromCsvRows(rows) {
  const people = rows.map(row => {
    const name = row['Name'].split(/\s+/).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const person = { name, wcaId: row['WCA ID'], events: [], solving: {}, scrambling: {}, judging: {} };
    eventObjects.forEach(eventObject => {
      if(row[eventObject.id] === '1') {
        person.events.push(eventObject.id);
      }
    });
    return person;
  });
  return _.sortBy(people, 'name');
}
