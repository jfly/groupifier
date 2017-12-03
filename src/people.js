import _ from 'lodash';

import { eventObjects } from './events';

export function peopleFromCsvRows(rows) {
  const people = rows.map(row => {
    const name = row['Name'].split(/\s+/).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const person = { name, wcaId: row['WCA ID'].toUpperCase(), events: [], solving: {}, scrambling: {}, judging: {} };
    person.events = _.map(eventObjects, 'id').filter(eventId => row[eventId] === '1');
    return person;
  });
  return _.sortBy(people, 'name');
}

export function attachWcaDataToPeople(people) {
  return fetchPeopleData(people).then(peopleData => {
    peopleData.forEach(personData => {
      _.find(people, { wcaId: personData.person.wca_id }).wcaData = personData;
    });
  });
}

function fetchPeopleData(people) {
  const apiUrl = 'https://www.worldcubeassociation.org/api/v0/persons?per_page=100&wca_ids=';
  const allWcaIds = _.compact(_.map(people, 'wcaId'));
  const promises = _.map(_.chunk(allWcaIds, 100), wcaIds =>
    fetch(apiUrl + wcaIds.join(',')).then(response => response.json())
  );
  return Promise.all(promises).then(_.flatten);
}
