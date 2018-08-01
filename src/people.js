import { parse as parseCSV } from 'papaparse';
import _ from 'lodash';

import { ApplicationError } from './errors';
import { eventObjects } from './events';
import { getPeopleData } from './wca-api';

class CsvParsingError extends ApplicationError {
  get type() { return 'CsvParsingError'; }
}

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
            age: calculateAge(new Date(row['Birth Date'])),
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
  const pdfNames = [{ text: latinName }, formatLocalName(localName)];
  const [first, second] = swapLatinWithLocalNames ? pdfNames.reverse() : pdfNames;
  return [first, ' (', second, ')'];
}

function formatLocalName(localName) {
  if (_.inRange(localName.charCodeAt(0), 0x0600, 0x06FF)) {
    /* https://en.wikipedia.org/wiki/Arabic_(Unicode_block) */
    /* Workaround for RTL https://github.com/bpampuch/pdfmake/issues/184#issuecomment-352168378 */
    return { text: localName.replace(/ /g, String.fromCharCode(160)), font: 'ElMassiri', fontSize: 10 };
  } else {
    /* Default to WenQuanYiZenHei as it supports many characters. */
    return { text: localName, font: 'WenQuanYiZenHei' };
  }
}

function calculateAge(dob) {
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.2425));
}
