import _ from 'lodash';

import { eventObjects, selfsufficientEvents } from './events';
import { ScramblersDialog } from './dialogs/scramblers-dialog';
import { ApplicationError } from './errors';

class IncompleteWcifError extends ApplicationError {
  get type() { return 'IncompleteWcifError'; }
}

export function assignGroups(allPeople, stationsCount, sortByResults, sideEventByMainEvent) {
  return _(eventObjects)
    .map('id')
    .map(eventId => [eventId, _.filter(allPeople, { events: [eventId] })])
    .reject(([eventId, people]) => _.isEmpty(people))
    .map(([eventId, people]) => {
      const groups = []
      /* The corresponding side event being held simultaneously. */
      const sideEventId = sideEventByMainEvent[eventId];
      let peopleSolvingSideEvent = [];
      if (sideEventId) {
        peopleSolvingSideEvent = people.filter(person => person.events.includes(sideEventId));
        const sideEvent = _.find(eventObjects, { id: sideEventId });
        /* Put people solving simultaneous events in separate groups. */
        groups.push(...assignGroupsForEvent(eventId, peopleSolvingSideEvent, sortByResults, stationsCount, 1, n => `${sideEvent.shortName}${n > 1 ? '-' + n : '' }`));
      }
      /* Force at least 2 groups unless this is a selfsufficient event.
         Note: we need at least 2 groups apart from those for people solving side events
         in order to scramblers for each group. */
      const minGroupsCount = selfsufficientEvents.includes(eventId) ? 1 : 2;
      groups.push(...assignGroupsForEvent(eventId, _.difference(people, peopleSolvingSideEvent), sortByResults, stationsCount, minGroupsCount, _.identity));

      return [eventId, { groups, people, peopleSolvingSideEvent }];
    })
    .value();
}

function assignGroupsForEvent(eventId, people, sortByResults, stationsCount, minGroupsCount, numberToId) {
  if (sortByResults) {
    people = _.orderBy(people, [
      `wcaData.personal_records.${eventId}.average.world_rank`,
      `wcaData.personal_records.${eventId}.single.world_rank`
    ], ['desc', 'desc']);
  } else {
    /* When sorting by results is disabled we aim to minimie the amount of people
       with the same name in the each group. This is achieved by sorting people,
       in a way that between each pair of people with the same name there is as huge gap as possible. */
    const peopleByName = _.groupBy(_.sortBy(people, 'name'), person => person.name.split(' ')[0]);
    /* We take sets of people with the same name and sort them by quantity.
       Starting with the smallest sets we keep adding people to a single set called `arrangedPeople`.
       For each set of people of length N (having the same name), we split `arrangedPeople` into N chunks
       and add one person to each of these chunks. Then we join the chunks back as the new `arrangedPeople` set. */
    people = _.reduce(_.sortBy(_.values(peopleByName), 'length'), (arrangedPeople, peopleOfSameName) => {
      const chunkSize = Math.ceil(arrangedPeople.length / peopleOfSameName.length);
      return _.compact(_.flatten(_.zipWith(_.chunk(arrangedPeople, chunkSize), _.chunk(peopleOfSameName, 1), _.concat)));
    });
  }
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

export function assignScrambling(eventsWithData, scramblersCount, askForScramblers, wcaIdsToSkip) {
  const scramblersDialog = askForScramblers && new ScramblersDialog();
  return _(eventsWithData)
    .reject(([eventId, data]) => selfsufficientEvents.includes(eventId))
    .sortBy(([eventId, { people }]) => people.length) /* Sort so that events with a smaller amount of people able to scramble go first. */
    .flatMap(([eventId, { groups, people, peopleSolvingSideEvent }]) => {
      return groups.map((group, groupIndex) => {
        return () => {
          const potentialScramblers = _.sortBy(_.difference(people, group.peopleSolving, peopleSolvingSideEvent), [
            /* People that shouldn't be assigned tasks are moved to the very end. */
            person => wcaIdsToSkip.includes(person.wcaId),
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
                                  ? scramblersDialog.getScramblers(potentialScramblers, scramblersCount, eventId, group.id)
                                  : Promise.resolve(_.take(potentialScramblers, scramblersCount));
          return scramblersPromise.then(scramblers => {
            group.peopleScrambling = scramblers;
            assignTask('scrambling', scramblers, eventId, group.id);
          });
        };
      });
    })
    .reduce((promise, fn) => promise.then(fn), Promise.resolve())
    .then(() => askForScramblers && scramblersDialog.close())
    /* Make sure the scramblers dialog is hidden from the screen before continuing. */
    .then(() => askForScramblers && new Promise(resolve => window.requestAnimationFrame(resolve)));
}

export function assignJudging(allPeople, eventsWithData, stationsCount, staffJudgesCount, wcaIdsToSkip, judgeOwnEventsOnly) {
  _(eventsWithData)
    .reject(([eventId, data]) => selfsufficientEvents.includes(eventId))
    .each(([eventId, { groups, people, peopleSolvingSideEvent }]) => {
      groups.forEach((group, groupIndex) => {
        const judgesCount = Math.min(stationsCount, group.peopleSolving.length);
        const additionalJudgesCount = judgesCount - staffJudgesCount;
        if(additionalJudgesCount > 0) {
          const potentialJudges = _.sortBy(_.difference(allPeople, group.peopleSolving, group.peopleScrambling, peopleSolvingSideEvent), [
            /* If judgeOwnEventsOnly is enabled, people that haven't registered for this event are moved to the very end. */
            person => judgeOwnEventsOnly && !people.includes(person),
            /* People that shouldn't be assigned tasks are moved to the very end. */
            person => wcaIdsToSkip.includes(person.wcaId),
            /* If possible, we avoid assigning a task to person solving in the next group. */
            person => _.get(groups, [groupIndex + 1, 'peopleSolving'], []).includes(person),
            /* We avoid assigning judging in more than two groups for the given event. */
            person => _.size(person.judging[eventId]) >= 2,
            /* Equally distribute tasks. */
            person => _.sum(_.map(person.scrambling, _.size)) + _.sum(_.map(person.judging, _.size)),
            /* Prefer people that solve fewer events, to avoid overloading people solving more. */
            /* Especially important when `judgeOwnEventsOnly` applies, it makes people able to judge fewer events to be assigned first. */
            person => person.events.length
          ]);
          group.peopleJudging = _.take(potentialJudges, additionalJudgesCount);
          assignTask('judging', group.peopleJudging, eventId, group.id);
        }
      });
    });
}

export function setWcifScrambleGroupsCount(wcif, eventsWithData, stationsCount) {
  _(eventsWithData)
    .each(([eventId, { groups, people }]) => {
      const wcifEvent = _.find(wcif.events, { id: eventId });
      const [firstWcifRound, ...nextWcifRounds] = wcifEvent.rounds;
      const eventName = _.find(eventObjects, { id: eventId }).name;
      if (!firstWcifRound) throw new IncompleteWcifError({ message: `No rounds specified for ${eventName}.` });
      firstWcifRound.scrambleSetCount = groups.length;
      _.reduce(nextWcifRounds, ([wcifRound, competitorsCount], nextWcifRound) => {
        const wcifAdvancementCondition = wcifRound.advancementCondition;
        if (!wcifAdvancementCondition) throw new IncompleteWcifError({ message: `Mising advancement conditions for ${eventName}.` });
        let nextRoundCompetitorsCount;
        switch (wcifAdvancementCondition.type) {
          case 'ranking':
            nextRoundCompetitorsCount = wcifAdvancementCondition.level;
            break;
          case 'percent':
            nextRoundCompetitorsCount = Math.floor(competitorsCount * wcifAdvancementCondition.level * 0.01);
            break;
          case 'attemptResult':
            /* Assume that people having personal best better than the advancement condition will make it to the next round. */
            nextRoundCompetitorsCount = _(people)
              .map(person => _.get(person, `wcaData.personal_records.${eventId}.single.best`, Infinity))
              .filter(best => best < wcifAdvancementCondition.level)
              .size();
            break;
          default:
            throw new Error(`Unrecognised AdvancementCondition type: '${wcifAdvancementCondition.type}'`);
        }
        nextWcifRound.scrambleSetCount = calculateGroupsCount(eventId, nextRoundCompetitorsCount, stationsCount, 1);
        return [nextWcifRound, nextRoundCompetitorsCount];
      }, [firstWcifRound, people.length]);
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
