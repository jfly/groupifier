import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';

export function assignGroups(allPeople, scramblersCount, stationsCount, staffJudgesCount, skipNewcomers) {
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
          group.peopleScrambling = helpers(_.difference(people, group.peopleSolving), scramblersCount, skipNewcomers);
          assignTask('scrambling', group.peopleScrambling, eventId, groupNumber);
          const judgesCount = Math.min(stationsCount, groupSize);
          const additionalJudgesCount = judgesCount - staffJudgesCount;
          if(additionalJudgesCount > 0) {
            group.peopleJudging = helpers(_.difference(allPeople, group.peopleSolving, group.peopleScrambling), additionalJudgesCount, skipNewcomers);
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

function helpers(people, count, skipNewcomers) {
  return _(people)
    .sortBy(person => {
      const helpRate = (_.sum(_.map(person.scrambling, _.size)) + _.sum(_.map(person.judging, _.size))) / _.size(person.events);
      return [skipNewcomers && person.wcaId === "", helpRate];
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
