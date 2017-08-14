import 'material-design-lite/material.css';
import 'material-design-lite/material.js';
import '../main.css';

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
const button = document.getElementById('generate');

fileInput.addEventListener('change', event => {
  fileNameInput.value = event.target.files[0].name;
  fileNameInput.parentNode.MaterialTextfield.checkDirty();
});

button.addEventListener('click', () => {
  const stationsCount = parseInt(stationsInput.value);
  const scramblersCount = parseInt(scramblersInput.value);
  const externalJudgesCount = parseInt(externalJudgesInput.value);
  parseCSV(fileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: ({ data: rows }) => {
      const people = _.sortBy(rows, 'Name').map(row => {
        const person = { name: row['Name'], wcaId: row['WCA ID'], events: [], solving: {}, scrambling: {}, judging: {} };
        eventObjects.forEach(eventObject => {
          if(row[eventObject.id] === '1') {
            person.events.push(eventObject.id);
          }
        });
        return person;
      });
      const groupsByEvent = assignGroups(people, scramblersCount, stationsCount, externalJudgesCount);
      createPersonalCardsPdf(people).open();
      createSummaryPdf(groupsByEvent).open();
    }
  })
});
