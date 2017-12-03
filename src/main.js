import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import 'mdl-selectfield/dist/mdl-selectfield.css';
import 'mdl-selectfield/dist/mdl-selectfield.js';
import '../assets/main.css';

import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { eventObjects } from './events';
import { assignGroups, assignScrambling, assignJudging } from './groups-assignment';
import { createPersonalCardsPdf, createSummaryPdf } from './pdf-creation';
import { sideEventsByMainEvents } from './simultaneous-events';

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
        });
      });
    }
  });
});

function peopleFromCsvRows(rows) {
  const people = rows.map(row => {
    const name = row['Name'].split(/\s+/).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const person = { name, wcaId: row['WCA ID'].toUpperCase(), events: [], solving: {}, scrambling: {}, judging: {} };
    person.events = _.map(eventObjects, 'id').filter(eventId => row[eventId] === '1');
    return person;
  });
  return _.sortBy(people, 'name');
}

function attachWcaDataToPeople(people) {
  return fetchPeopleData(people).then(peopleData => {
    peopleData.forEach(personData => {
      _.find(people, { wcaId: personData.person.wca_id }).wcaData = personData;
    });
  });
}

function fetchPeopleData(people) {
  const apiUrl = 'https://www.worldcubeassociation.org/api/v0/persons?per_page=100&wca_ids=';
  const allWcaIds = _.compact(_.map(people, 'wcaId'));
  const promises = _.map(_.chunk(allWcaIds, 100), wcaIds =>
    fetch(apiUrl + wcaIds.join(',')).then(response => response.json())
  );
  return Promise.all(promises).then(_.flatten);
}
