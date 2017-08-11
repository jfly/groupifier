import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { eventObjects } from './events';

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
      const people = _.sortBy(rows, 'Name').map(row => {
        const person = { name: row['Name'], wcaId: row['WCA ID'], events: [], solving: {} };
        eventObjects.forEach(eventObject => {
          if(row[eventObject.id] === '1') {
            person.events.push(eventObject.id);
          }
        });
        return person;
      });
      assignGroups(people, scramblersCount, stationsCount);
    }
  })
});

function assignGroups(allPeople, scramblersCount, stationsCount) {
  const peopleByEvent = {};
  allPeople.forEach(person => {
    person.events.forEach(eventId => {
      peopleByEvent[eventId] = peopleByEvent[eventId] || [];
      peopleByEvent[eventId].push(person);
    });
  });
  _(peopleByEvent)
    .toPairs()
    .sortBy(([eventId, people]) => people.length) /* Start from the least popular events so that there are free people able to scramble them. */
    .each(([eventId, people]) => {
      const groupsCount = calculateGroupsCount(eventId, people.length, stationsCount);
      const groupSize = Math.ceil(people.length / groupsCount);
      console.log("Event: ", eventId, "\nPeople: ", people.length, "\nGroups: ", groupsCount, "\nGroup size: ", groupSize, "\n\n---\n\n");
      _.range(1, groupsCount + 1).forEach(groupNumber => {
        const peopleSolving = people.slice((groupNumber - 1) * groupSize, groupNumber * groupSize);
        peopleSolving.forEach(person => person.solving[eventId] = groupNumber);
      })
    });
}

function calculateGroupsCount(eventId, peopleCount, stationsCount) {
  if(['333fm', '444bf', '555bf', '333mbf'].includes(eventId)) {
    return 1;
  } else {
    const calculatedGroupSize = Math.ceil(stationsCount * 1.7); /* Suggested number of people in a single group. */
    const calculatedGroupsCount = Math.round(peopleCount / calculatedGroupSize)
    return Math.max(calculatedGroupsCount, 2); /* Force at least 2 groups. */
  }
}
