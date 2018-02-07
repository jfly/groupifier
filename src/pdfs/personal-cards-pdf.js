import _ from 'lodash';

import { PdfDocument } from './pdf-document';
import { eventObjects } from '../events';

export class PersonalCardsPdf extends PdfDocument {
  constructor(people) {
    super('personal-cards.pdf');
    const competitionEvents = _(people).map('events').flatten().uniq().value();
    const personalCards = _.sortBy(people, 'name').map(person => this.personalCard(competitionEvents, person));
    const personalCardsInLastRow = personalCards.length % 3;
    personalCardsInLastRow === 0 || personalCards.push(..._.times(3 - personalCardsInLastRow, _.constant({})));
    this.definition = {
      pageMargins: [5, 5, 5, 5],
      content: _.chunk(personalCards, 3).map(cards => (
        { columns: cards, fontSize: 8, margin: [0, 0, 0, 10] , unbreakable: true }
      ))
    };
  }

  personalCard(competitionEvents, person) {
    const tableBody = eventObjects
      .filter(eventObject => competitionEvents.includes(eventObject.id))
      .map(eventObject => {
        const groupsText = task => ({ text: (person[task][eventObject.id] || []).join(', '), alignment: 'center' });
        return [eventObject.name, groupsText('solving'), groupsText('scrambling'), groupsText('judging')];
      });
    return [
      { text: person.pdfName },
      { text: person.wcaId ? `WCA ID: ${person.wcaId}` : " " },
      {
        table: {
          body: [['Event', 'Solving', 'Scrambling', 'Judging'], ...tableBody]
        },
        layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 }
      }
    ];
  }
}
