import { parse as parseCSV } from 'papaparse';

import { allEvents } from './events';

const fileInput = document.getElementById('file-input');
const button = document.getElementById('generate');

button.addEventListener('click', () => {
  parseCSV(fileInput.files[0], {
    header: true,
    complete: ({ data: rows }) => {
      const people = rows.map(row => {
        const person = { name: row['Name'], wcaId: row['WCA ID'], events: [] };
        allEvents.forEach(event => {
          if(row[event.id] === "1") {
            person.events.push(event.id);
          }
        });
        return person;
      });
      console.log(people);
    }
  })
});
