import _ from 'lodash';

import { eventObjects } from './events';
import { getPeopleData } from './wca-api';

export function peopleFromCsvRows(rows) {
  const people = rows.map((row, index) => {
    const name = row['Name'].split(/\s+/).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const person = { id: index + 1, name, wcaId: row['WCA ID'].toUpperCase(), events: [], solving: {}, scrambling: {}, judging: {} };
    person.events = _.map(eventObjects, 'id').filter(eventId => row[eventId] === '1');
    return person;
  });
  return _.sortBy(people, 'name');
}

export function attachWcaDataToPeople(people) {
  return getPeopleData(_.compact(_.map(people, 'wcaId'))).then(peopleData => {
    peopleData.forEach(personData => {
      _.find(people, { wcaId: personData.person.wca_id }).wcaData = personData;
    });
  });
}
