import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';
import { selectScramblers } from './select-scramblers';

export function assignGroups(allPeople, scramblersCount, stationsCount, staffJudgesCount, skipNewcomers) {
  const peopleByEvent = {};
  allPeople.forEach(person => {
    person.events.forEach(eventId => {
      peopleByEvent[eventId] = peopleByEvent[eventId] || [];
      peopleByEvent[eventId].push(person);
    });
  });
  const groupsByEvent = {};
  return _(peopleByEvent)
    .toPairs()
    .sortBy(([eventId, people]) => people.length) /* Start from the least popular events so that there are free people able to scramble them. */
    .map(([eventId, people]) => {
      const groups = groupsByEvent[eventId] = [];
      const groupsCount = calculateGroupsCount(eventId, people.length, stationsCount);
      const groupSize = Math.ceil(people.length / groupsCount);
      _.range(1, groupsCount + 1).forEach(groupNumber => {
        const group = { number: groupNumber };
        group.peopleSolving = people.slice((groupNumber - 1) * groupSize, groupNumber * groupSize);
        assignTask('solving', group.peopleSolving, eventId, groupNumber);
        groups.push(group);
      });
      return [eventId, groups];
    })
    .reject(([eventId, groups]) => selfsufficientEvents.includes(eventId))
    .reduce((promise, [eventId, groups]) => {
      return promise.then(() => {
        const people = peopleByEvent[eventId];
        return groups.reduce((promise, group) => {
          return promise.then(() => {
            const potentialScramblers = sortPeopleToHelp(_.difference(people, group.peopleSolving), skipNewcomers);
            return selectScramblers(potentialScramblers, scramblersCount).then(scramblers => {
              group.peopleScrambling = scramblers;
              assignTask('scrambling', scramblers, eventId, group.number);
              const judgesCount = Math.min(stationsCount, group.peopleSolving.length);
              const additionalJudgesCount = judgesCount - staffJudgesCount;
              if(additionalJudgesCount > 0) {
                const potentialJudges = sortPeopleToHelp(_.difference(allPeople, group.peopleSolving, group.peopleScrambling), skipNewcomers);
                group.peopleJudging = _.take(potentialJudges, judgesCount);
                assignTask('judging', group.peopleJudging, eventId, group.number);
              }
            });
          });
        }, Promise.resolve());
      });
    }, Promise.resolve())
    .then(() => groupsByEvent);
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

function sortPeopleToHelp(people, skipNewcomers) {
  return _.sortBy(people, person => {
    const helpRate = (_.sum(_.map(person.scrambling, _.size)) + _.sum(_.map(person.judging, _.size))) / _.size(person.events);
    return [skipNewcomers && person.wcaId === "", helpRate];
  });
}

function assignTask(task, people, eventId, groupNumber) {
  people.forEach(person => {
    person[task][eventId] = person[task][eventId] || [];
    person[task][eventId].push(groupNumber);
  });
}
