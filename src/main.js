import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfMakeFonts.pdfMake.vfs;

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
      generatePersonalCardsPdf(people);
      generateSummaryPdf(groupsByEvent);
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

function generatePersonalCardsPdf(people) {
  const competitionEvents = _(people).map('events').flatten().uniq().value();
  const personalCards = people.map(person => {
    const table = eventObjects
      .filter(eventObject => competitionEvents.includes(eventObject.id))
      .map(eventObject => {
        const groupsText = task => ({ text: (person[task][eventObject.id] || []).join(', '), alignment: 'center' });
        return [eventObject.name, groupsText('solving'), groupsText('scrambling'), groupsText('judging')];
      });
    return [
      { text: person.name, bold: true },
      {
        table: {
          body: [['Event', 'Solving', 'Scrambling', 'Judging'], ...table]
        },
        layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 }
      }
    ];
  });
  const documentDefinition = {
    content: _.chunk(personalCards, 3).map(cards => (
      { columns: cards, fontSize: 8, margin: [0, 0, 0, 10] , unbreakable: true }
    )),
    pageMargins: [5, 5, 5, 5]
  };
  pdfMake.createPdf(documentDefinition).open();
}

function generateSummaryPdf(groupsByEvent) {
  const documentDefinition = {
    content: eventObjects
      .filter(eventObject => groupsByEvent[eventObject.id])
      .map(eventObject =>
        groupsByEvent[eventObject.id].map(group =>
          [
            {
              unbreakable: true,
              margin: [0, 0, 0, 10],
              stack: [
                { text: `${eventObject.name} - Group ${group.number}`, bold: true, fontSize: 14, margin: [0, 0, 0, 5] },
                {
                  fontSize: 8,
                  columns: ['Solving', 'Scrambling', 'Judging'].map(type => {
                    const people = group[`people${type}`];
                    if(!people) return {};
                    return [
                      { text: `${type} (${people.length})`, bold: true, fontSize: 10, margin: [0, 0, 0, 2] },
                      { ul: _.map(people, 'name').sort() }
                    ];
                  })
                }
              ]
            }
          ]
        )
      )
  };
  pdfMake.createPdf(documentDefinition).open();
}
