import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { eventObjects } from './events';

const fileInput = document.getElementById('file-input');
const stationsInput = document.getElementById('stations-input');
const scramblersInput = document.getElementById('scramblers-input');
const externalJudgesInput = document.getElementById('external-judges-input');
const button = document.getElementById('generate');
/* These events consist of a single round and doesn't require assigning scramblers and judges. */
const selfsufficientEvents = ['333fm', '444bf', '555bf', '333mbf'];

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
    }
  })
});

function assignGroups(allPeople, scramblersCount, stationsCount, externalJudgesCount) {
  const peopleByEvent = {};
  allPeople.forEach(person => {
    person.events.forEach(eventId => {
      peopleByEvent[eventId] = peopleByEvent[eventId] || [];
      peopleByEvent[eventId].push(person);
    });
  });
  const groupsByEvent = {};
  _(peopleByEvent)
    .toPairs()
    .sortBy(([eventId, people]) => people.length) /* Start from the least popular events so that there are free people able to scramble them. */
    .each(([eventId, people]) => {
      const groups = groupsByEvent[eventId] = [];
      const groupsCount = calculateGroupsCount(eventId, people.length, stationsCount);
      const groupSize = Math.ceil(people.length / groupsCount);
      _.range(1, groupsCount + 1).forEach(groupNumber => {
        const group = { number: groupNumber };
        group.peopleSolving = people.slice((groupNumber - 1) * groupSize, groupNumber * groupSize);
        assignTask('solving', group.peopleSolving, eventId, groupNumber);
        if(!selfsufficientEvents.includes(eventId)) {
          group.peopleScrambling = helpers(_.difference(people, group.peopleSolving), scramblersCount);
          assignTask('scrambling', group.peopleScrambling, eventId, groupNumber);
          const judgesCount = Math.min(stationsCount, groupSize);
          const additionalJudgesCount = judgesCount - externalJudgesCount;
          if(additionalJudgesCount > 0) {
            group.peopleJudging = helpers(_.difference(allPeople, group.peopleSolving, group.peopleScrambling), additionalJudgesCount);
            assignTask('judging', group.peopleJudging, eventId, groupNumber);
          }
        }
        groups.push(group);
      });
    });
  return groupsByEvent;
}

function calculateGroupsCount(eventId, peopleCount, stationsCount) {
  if(selfsufficientEvents.includes(eventId)) {
    return 1;
  } else {
    const calculatedGroupSize = Math.ceil(stationsCount * 1.7); /* Suggested number of people in a single group. */
    const calculatedGroupsCount = Math.round(peopleCount / calculatedGroupSize)
    return Math.max(calculatedGroupsCount, 2); /* Force at least 2 groups. */
  }
}

function helpers(people, count) {
  return _(people)
    .sortBy(person => {
      const helpRate = (_.size(person.scrambling) + _.size(person.judging)) / _.size(person.events);
      return [person.wcaId === "", helpRate];
    })
    .take(count)
    .value();
}

function assignTask(task, people, eventId, groupNumber) {
  people.forEach(person => {
    person[task][eventId] = person[task][eventId] || [];
    person[task][eventId].push(groupNumber);
  });
}
