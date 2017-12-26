import _ from 'lodash';

import { PdfDocument } from './pdf-document';
import { eventObjects } from '../events';

export class PersonalCardsPdf extends PdfDocument {
  constructor(people) {
    super('personal-cards.pdf');
    const competitionEvents = _(people).map('events').flatten().uniq().value();
    const personalCards = people.map(person => {
      const tableBody = eventObjects
        .filter(eventObject => competitionEvents.includes(eventObject.id))
        .map(eventObject => {
          const groupsText = task => ({ text: (person[task][eventObject.id] || []).join(', '), alignment: 'center' });
          return [eventObject.name, groupsText('solving'), groupsText('scrambling'), groupsText('judging')];
        });
      return [
        { text: `${person.name}`, bold: true },
        { text: person.wcaId ? `WCA ID: ${person.wcaId}` : " " },
        {
          table: {
            body: [['Event', 'Solving', 'Scrambling', 'Judging'], ...tableBody]
          },
          layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 }
        }
      ];
    });
    /* Force the presence of three cards for each row. */
    while(personalCards.length % 3) {
      personalCards.push([]);
    }
    this.definition = {
      content: _.chunk(personalCards, 3).map(cards => (
        { columns: cards, fontSize: 8, margin: [0, 0, 0, 10] , unbreakable: true }
      )),
      pageMargins: [5, 5, 5, 5]
    };
  }
}
