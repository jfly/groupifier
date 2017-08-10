import { parse as parseCSV } from 'papaparse';

import { allEvents } from './events';

const fileInput = document.getElementById('file-input');
const stationsInput = document.getElementById('stations-input');
const scramblersInput = document.getElementById('scramblers-input');
const button = document.getElementById('generate');

button.addEventListener('click', () => {
  const stationsCount = parseInt(stationsInput.value);
  const scramblersCount = parseInt(scramblersInput.value);
  parseCSV(fileInput.files[0], {
    header: true,
    complete: ({ data: rows }) => {
      const people = rows.map(row => {
        const person = { name: row['Name'], wcaId: row['WCA ID'], events: [] };
        allEvents.forEach(event => {
          if(row[event.id] === '1') {
            person.events.push(event.id);
          }
        });
        return person;
      });
      console.log(people);
    }
  })
});
