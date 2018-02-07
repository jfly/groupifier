import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { ApplicationError } from './errors';
import { eventObjects } from './events';
import { getPeopleData } from './wca-api';

class CsvParsingError extends ApplicationError {}

export function peopleFromCsvFile(file, swapLatinWithLocalNames) {
  return new Promise((resolve, reject) => {
    parseCSV(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows, errors }) => {
        _.isEmpty(errors) || reject(new CsvParsingError(errors));
        resolve(
          rows.map((row, index) => ({
            id: index + 1,
            name: row['Name'],
            pdfName: pdfName(row['Name'], swapLatinWithLocalNames),
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

function pdfName(name, swapLatinWithLocalNames) {
  const [match, latinName, localName] = name.match(/(.+)\s+\((.+)\)/) || [null, name, null];
  if (!localName) return [{ text: latinName }];
  const pdfNames = [{ text: latinName }, { text: localName, font: 'WenQuanYiZenHei' }];
  const [first, second] = swapLatinWithLocalNames ? pdfNames.reverse() : pdfNames;
  return [first, ' (', second, ')'];
}
