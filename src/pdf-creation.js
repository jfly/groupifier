import _ from 'lodash';

/* Workaround, see: https://github.com/bpampuch/pdfmake/issues/910#issuecomment-311824467 */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfMakeFonts.pdfMake.vfs;

import { eventObjects } from './events';

export function createPersonalCardsPdf(people) {
  const competitionEvents = _(people).map('events').flatten().uniq().value();
  const personalCards = people.map(person => {
    const table = eventObjects
      .filter(eventObject => competitionEvents.includes(eventObject.id))
      .map(eventObject => {
        const groupsText = task => ({ text: (person[task][eventObject.id] || []).join(', '), alignment: 'center' });
        return [eventObject.name, groupsText('solving'), groupsText('scrambling'), groupsText('judging')];
      });
    return [
      { text: person.name, bold: true },
      {
        table: {
          body: [['Event', 'Solving', 'Scrambling', 'Judging'], ...table]
        },
        layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 }
      }
    ];
  });
  const documentDefinition = {
    content: _.chunk(personalCards, 3).map(cards => (
      { columns: cards, fontSize: 8, margin: [0, 0, 0, 10] , unbreakable: true }
    )),
    pageMargins: [5, 5, 5, 5]
  };
  return pdfMake.createPdf(documentDefinition);
}

export function createSummaryPdf(groupsByEvent) {
  const documentDefinition = {
    content: eventObjects
      .filter(eventObject => groupsByEvent[eventObject.id])
      .map(eventObject =>
        groupsByEvent[eventObject.id].map(group =>
          [
            {
              unbreakable: true,
              margin: [0, 0, 0, 10],
              stack: [
                { text: `${eventObject.name} - Group ${group.number}`, bold: true, fontSize: 14, margin: [0, 0, 0, 5] },
                {
                  fontSize: 8,
                  columns: ['Solving', 'Scrambling', 'Judging'].map(type => {
                    const people = group[`people${type}`];
                    if(!people) return {};
                    return [
                      { text: `${type} (${people.length})`, bold: true, fontSize: 10, margin: [0, 0, 0, 2] },
                      { ul: _.map(people, 'name').sort() }
                    ];
                  })
                }
              ]
            }
          ]
        )
      )
  };
  return pdfMake.createPdf(documentDefinition);
}
