import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { ApplicationError } from './errors';
import { eventObjects } from './events';
import { getPeopleData } from './wca-api';

class CsvParsingError extends ApplicationError {}

export function peopleFromCsvFile(file) {
  return new Promise((resolve, reject) => {
    parseCSV(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows, errors }) => {
        _.isEmpty(errors) || reject(new CsvParsingError(errors));
        resolve(
          rows.map((row, index) => ({
            id: index + 1,
            name: row['Name'].split(/\s+/).map(_.capitalize).join(' '),
            wcaId: row['WCA ID'].toUpperCase(),
            events: _.map(eventObjects, 'id').filter(eventId => row[eventId] === '1'),
            solving: {},
            scrambling: {},
            judging: {}
          }))
        );
      }
    });
  });
}

export function peopleWithWcaData(people) {
  return getPeopleData(_.compact(_.map(people, 'wcaId')))
    .then(peopleData => {
      peopleData.forEach(personData => {
        _.find(people, { wcaId: personData.person.wca_id }).wcaData = personData;
      });
    })
    .then(() => people);
}
