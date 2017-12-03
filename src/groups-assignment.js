import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';
import { selectScramblers } from './select-scramblers';

export function assignGroups(allPeople, stationsCount, sideEventByMainEvent) {
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
      const groups = []
      /* The corresponding side event being held simultaneously. */
      const sideEventId = sideEventByMainEvent[eventId];
      if (sideEventId) {
        const peopleSolvingSideEvent = people.filter(person => person.events.includes(sideEventId));
        const sideEvent = _.find(eventObjects, { id: sideEventId });
        /* Put people solving simultaneous events in separate groups. */
        groups.push(...assignGroupsForEvent(eventId, peopleSolvingSideEvent, stationsCount, 1, n => `${sideEvent.shortName}${n > 1 ? '-' + n : '' }`));
        people = _.difference(people, peopleSolvingSideEvent);
      }
      /* Force at least 2 groups unless this is a selfsufficient event. */
      const minGroupsCount = (groups.length > 0 || selfsufficientEvents.includes(eventId)) ? 1 : 2;
      groups.push(...assignGroupsForEvent(eventId, people, stationsCount, minGroupsCount, _.identity));

      return [eventId, groups];
    })
    .value();
}

function assignGroupsForEvent(eventId, people, stationsCount, minGroupsCount, numberToId) {
  const groups = [];
  const groupsCount = calculateGroupsCount(eventId, people.length, stationsCount, minGroupsCount);
  _.range(1, groupsCount + 1).forEach(groupNumber => {
    const group = { id: numberToId(groupNumber) };
    const assignedPeopleCount = _.flatMap(groups, 'peopleSolving').length;
    const groupSize = Math.ceil((people.length - assignedPeopleCount) / (groupsCount - groups.length));
    group.peopleSolving = people.slice(assignedPeopleCount, assignedPeopleCount + groupSize);
    assignTask('solving', group.peopleSolving, eventId, group.id);
    groups.push(group);
  });
  return groups;
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
                                  ? selectScramblers(potentialScramblers, scramblersCount, eventId, group.id)
                                  : Promise.resolve(_.take(potentialScramblers, scramblersCount));
          return scramblersPromise.then(scramblers => {
            group.peopleScrambling = scramblers;
            assignTask('scrambling', scramblers, eventId, group.id);
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
          assignTask('judging', group.peopleJudging, eventId, group.id);
        }
      });
    });
}

function calculateGroupsCount(eventId, peopleCount, stationsCount, minGroupsCount) {
  if(selfsufficientEvents.includes(eventId)) {
    return 1;
  } else {
    const calculatedGroupSize = stationsCount * 1.7; /* Suggested number of people in a single group. */
    /* We calculate the number of perfectly-sized groups, and round it up starting from x.1,
       this way we don't end up with much more than the perfect amount of people in a single group.
       Having more small groups is preferred over having fewer big groups. */
    const calculatedGroupsCount = Math.round(peopleCount / calculatedGroupSize + 0.4);
    return Math.max(calculatedGroupsCount, minGroupsCount);
  }
}

function sortPeopleToHelp(people, skipNewcomers) {
  return _.sortBy(people, person => {
    const helpRate = (_.sum(_.map(person.scrambling, _.size)) + _.sum(_.map(person.judging, _.size))) / _.size(person.events);
    return [skipNewcomers && person.wcaId === "", helpRate];
  });
}

function assignTask(task, people, eventId, groupId) {
  people.forEach(person => {
    person[task][eventId] = person[task][eventId] || [];
    person[task][eventId].push(groupId);
  });
}
