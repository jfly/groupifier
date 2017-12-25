import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';
import { selectScramblers } from './select-scramblers';

export function assignGroups(allPeople, stationsCount, sortByResults, sideEventByMainEvent) {
  return _(eventObjects)
    .map('id')
    .map(eventId => [eventId, _.filter(allPeople, { events: [eventId] })])
    .reject(([eventId, people]) => _.isEmpty(people))
    .map(([eventId, people]) => {
      if (sortByResults) {
        people = _.orderBy(people, [
          `wcaData.personal_records.${eventId}.average.world_rank`,
          `wcaData.personal_records.${eventId}.single.world_rank`
        ], ['desc', 'desc']);
      }
      const groups = []
      /* The corresponding side event being held simultaneously. */
      const sideEventId = sideEventByMainEvent[eventId];
      let peopleSolvingSideEvent = [];
      if (sideEventId) {
        peopleSolvingSideEvent = people.filter(person => person.events.includes(sideEventId));
        const sideEvent = _.find(eventObjects, { id: sideEventId });
        /* Put people solving simultaneous events in separate groups. */
        groups.push(...assignGroupsForEvent(eventId, peopleSolvingSideEvent, stationsCount, 1, n => `${sideEvent.shortName}${n > 1 ? '-' + n : '' }`));
      }
      /* Force at least 2 groups unless this is a selfsufficient event.
         Note: we need at least 2 groups apart from those for people solving side events
         in order to scramblers for each group. */
      const minGroupsCount = selfsufficientEvents.includes(eventId) ? 1 : 2;
      groups.push(...assignGroupsForEvent(eventId, _.difference(people, peopleSolvingSideEvent), stationsCount, minGroupsCount, _.identity));

      return [eventId, { groups, people, peopleSolvingSideEvent }];
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

export function assignScrambling(eventsWithData, scramblersCount, askForScramblers, skipNewcomers) {
  return _(eventsWithData)
    .reject(([eventId, data]) => selfsufficientEvents.includes(eventId))
    .sortBy(([eventId, { people }]) => people.length) /* Sort so that events with a smaller amount of people able to scramble go first. */
    .flatMap(([eventId, { groups, people, peopleSolvingSideEvent }]) => {
      return groups.map((group, groupIndex) => {
        return () => {
          const potentialScramblers = _.sortBy(_.difference(people, group.peopleSolving, peopleSolvingSideEvent), [
            /* If skipNewcomers is false this doesn't have any effect, otherwise people with WCA ID go first. */
            person => skipNewcomers && person.wcaId === "",
            /* If possible, we avoid assigning a task to person solving in the next group. */
            person => _.get(groups, [groupIndex + 1, 'peopleSolving'], []).includes(person),
            /* We avoid assigning scrambling in more than two groups for the given event. */
            person => _.size(person.scrambling[eventId]) >= 2,
            /* We avoid assigning scrambling in more than six groups in general. */
            person => _.sum(_.map(person.scrambling, _.size)) >= 6,
            /* Sort scramblers by results. */
            person => _.get(person, `wcaData.personal_records.${eventId}.average.world_rank`),
            person => _.get(person, `wcaData.personal_records.${eventId}.single.world_rank`),
          ]);
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
    .reduce((promise, fn) => promise.then(fn), Promise.resolve())
    .then(() => new Promise(resolve => window.requestAnimationFrame(resolve))); /* Make sure the last scramblers dialog is hidden from the screen before continuing. */
}

export function assignJudging(allPeople, eventsWithData, stationsCount, staffJudgesCount, skipNewcomers) {
  _(eventsWithData)
    .reject(([eventId, data]) => selfsufficientEvents.includes(eventId))
    .each(([eventId, { groups, people, peopleSolvingSideEvent }]) => {
      groups.forEach((group, groupIndex) => {
        const judgesCount = Math.min(stationsCount, group.peopleSolving.length);
        const additionalJudgesCount = judgesCount - staffJudgesCount;
        if(additionalJudgesCount > 0) {
          const potentialJudges = _.sortBy(_.difference(allPeople, group.peopleSolving, group.peopleScrambling, peopleSolvingSideEvent), [
            /* If skipNewcomers is false this doesn't have any effect, otherwise people with WCA ID go first. */
            person => skipNewcomers && person.wcaId === "",
            /* If possible, we avoid assigning a task to person solving in the next group. */
            person => _.get(groups, [groupIndex + 1, 'peopleSolving'], []).includes(person),
            /* Equally distribute tasks. */
            person => _.sum(_.map(person.scrambling, _.size)) + _.sum(_.map(person.judging, _.size)),
          ]);
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

function assignTask(task, people, eventId, groupId) {
  people.forEach(person => {
    _.update(person, [task, eventId], groupIds => _.concat(groupIds || [], groupId));
  });
}
