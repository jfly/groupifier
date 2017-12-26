import _ from 'lodash';

import { PdfDocument } from './pdf-document';
import { eventObjects } from '../events';

export class SummaryPdf extends PdfDocument {
  constructor(eventsWithData) {
    super('summary.pdf');
    const groupsByEvent = _.mapValues(_.fromPairs(eventsWithData), 'groups');
    this.definition = {
      content: eventObjects
        .filter(eventObject => groupsByEvent[eventObject.id])
        .map(eventObject =>
          groupsByEvent[eventObject.id].map(group =>
            [
              {
                unbreakable: true,
                margin: [0, 0, 0, 10],
                stack: [
                  { text: `${eventObject.name} - Group ${group.id}`, bold: true, fontSize: 14, margin: [0, 0, 0, 5] },
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
  }
}
