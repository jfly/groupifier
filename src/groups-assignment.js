import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';
import { selectScramblers } from './select-scramblers';

export function assignGroups(allPeople, stationsCount) {
  const peopleByEvent = {};
  allPeople.forEach(person => {
    person.events.forEach(eventId => {
      peopleByEvent[eventId] = peopleByEvent[eventId] || [];
      peopleByEvent[eventId].push(person);
    });
  });
  return _(peopleByEvent)
    .toPairs()
    .sortBy(([eventId, people]) => people.length) /* Sort so that events with a smaller amount of people able to help go first. */
    .map(([eventId, people]) => {
      const groups = [];
      const groupsCount = calculateGroupsCount(eventId, people.length, stationsCount);
      _.range(1, groupsCount + 1).forEach(groupNumber => {
        const assignedPeopleCount = _.flatMap(groups, 'peopleSolving').length;
        const groupSize = Math.ceil((people.length - assignedPeopleCount) / (groupsCount - groups.length));
        const group = { number: groupNumber };
        group.peopleSolving = people.slice(assignedPeopleCount, assignedPeopleCount + groupSize);
        assignTask('solving', group.peopleSolving, eventId, groupNumber);
        groups.push(group);
      });
      return [eventId, groups];
    })
    .value();
}

export function assignScrambling(eventsWithGroups, scramblersCount, askForScramblers, skipNewcomers) {
  return _(eventsWithGroups)
    .reject(([eventId, groups]) => selfsufficientEvents.includes(eventId))
    .flatMap(([eventId, groups]) => {
      const people = _.flatMap(groups, 'peopleSolving');
      return groups.map(group => {
        return () => {
          const potentialScramblers = sortPeopleToHelp(_.difference(people, group.peopleSolving), skipNewcomers);
          const scramblersPromise = askForScramblers
                                  ? selectScramblers(potentialScramblers, scramblersCount, eventId, group.number)
                                  : Promise.resolve(_.take(potentialScramblers, scramblersCount));
          return scramblersPromise.then(scramblers => {
            group.peopleScrambling = scramblers;
            assignTask('scrambling', scramblers, eventId, group.number);
          });
        };
      });
    })
    .reduce((promise, fn) => promise.then(fn), Promise.resolve());
}

export function assignJudging(allPeople, eventsWithGroups, stationsCount, staffJudgesCount, skipNewcomers) {
  _(eventsWithGroups)
    .reject(([eventId, groups]) => selfsufficientEvents.includes(eventId))
    .each(([eventId, groups]) => {
      groups.forEach(group => {
        const judgesCount = Math.min(stationsCount, group.peopleSolving.length);
        const additionalJudgesCount = judgesCount - staffJudgesCount;
        if(additionalJudgesCount > 0) {
          const potentialJudges = sortPeopleToHelp(_.difference(allPeople, group.peopleSolving, group.peopleScrambling), skipNewcomers);
          group.peopleJudging = _.take(potentialJudges, judgesCount);
          assignTask('judging', group.peopleJudging, eventId, group.number);
        }
      });
    });
}

function calculateGroupsCount(eventId, peopleCount, stationsCount) {
  if(selfsufficientEvents.includes(eventId)) {
    return 1;
  } else {
    const calculatedGroupSize = stationsCount * 1.7; /* Suggested number of people in a single group. */
    /* We calculate the number of perfectly-sized groups, and round it up starting from x.1,
       this way we don't end up with much more than the perfect amount of people in a single group.
       Having more small groups is preferred over having fewer big groups. */
    const calculatedGroupsCount = Math.round(peopleCount / calculatedGroupSize + 0.4);
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
