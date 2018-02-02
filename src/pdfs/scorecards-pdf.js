import _ from 'lodash';

import { PdfDocument } from './pdf-document';
import { eventObjects } from '../events';
import { cutoffToString, timeLimitToString } from '../helpers';

const pageWidth = 595;
const pageHeight = 842;
const scorecardMargin = 20;

export class ScorecardsPdf extends PdfDocument {
  constructor(eventsWithData, wcif) {
    super('scorecards.pdf');
    const groupsByEvent = _.mapValues(_.fromPairs(eventsWithData), 'groups');
    const events = eventObjects.filter(eventObject => groupsByEvent[eventObject.id] && eventObject.id !== '333fm');
    const maxAttemptsCountByFormat = { '1': 1, '2': 2, '3': 3, 'm': 3, 'a': 5 };
    const scorecards = _.flatMap(events, eventObject => {
      let scorecardNumber = _.fromPairs(eventsWithData)[eventObject.id].people.length;
      const wcifEvent = _.find(wcif.events, { id: eventObject.id }) || {};
      const firstRound = _.get(wcifEvent.rounds, '0', {});
      const { cutoff, timeLimit } = firstRound;
      const maxAttemptsCount = maxAttemptsCountByFormat[firstRound.format];
      return _.flatMap(groupsByEvent[eventObject.id], group => {
        const groupScorecards = _.map(group.peopleSolving, person =>
          this.scorecard(scorecardNumber--, wcif.shortName, eventObject, group.id, person, maxAttemptsCount, cutoff, timeLimit)
        );
        const scorecardsOnLastPage = groupScorecards.length % 4;
        return scorecardsOnLastPage === 0 ? groupScorecards : groupScorecards.concat(_.times(4 - scorecardsOnLastPage, _.constant({})));
      });
    });
    const dashedLine = properties =>
      _.assign({ type: 'line', lineWidth: 0.1, dash: { length: 10 }, lineColor: '#888888' }, properties);
    this.definition = {
      background: [
        {
          canvas: [
            dashedLine({ x1: scorecardMargin, y1: pageHeight / 2, x2: pageWidth - scorecardMargin, y2: pageHeight / 2 }),
            dashedLine({ x1: pageWidth / 2, y1: scorecardMargin, x2: pageWidth / 2, y2:  pageHeight - scorecardMargin })
          ]
        },
      ],
      pageMargins: scorecardMargin,
      content: {
        layout: {
          paddingLeft: i => (i % 2 === 0 ? 0 : scorecardMargin),
          paddingRight: i => (i % 2 === 0 ? scorecardMargin : 0),
          paddingTop: i => (i % 2 === 0 ? 0 : scorecardMargin),
          paddingBottom: i => (i % 2 === 0 ? scorecardMargin : 0),
          defaultBorder: false
        },
        table: {
          widths: ['*', '*'],
          /* A4 page height in pixels minus vertical margins and three invisible, vertical borders of the root table, divided into a half. */
          heights: Math.floor((pageHeight - 4 * scorecardMargin - 3) / 2),
          dontBreakRows: true,
          body: _.chunk(scorecards, 2)
        }
      }
    };
  }

  scorecard(scorecardNumber, competitionName, eventObject, groupId, person, maxAttemptsCount, cutoff, timeLimit) {
    const columnLabels = (labels, style = {}) =>
      labels.map(label => _.assign({ border: [false, false, false, false], fontSize: 10, text: label }, style));

    return [
      { text: scorecardNumber, fontSize: 10 },
      { text: competitionName, bold: true, fontSize: 15, margin: [0, 0, 0, 10], alignment: 'center' },
      {
        margin: [25, 0, 0, 0],
        table: {
          widths: ['*', 'auto', 'auto'],
          body: [
            columnLabels(['Event', 'Round', 'Group']),
            [eventObject.name, { text: '1', alignment: 'center' }, { text: groupId, alignment: 'center' }]
          ]
        }
      },
      {
        margin: [25, 0, 0, 0],
        table: {
          widths: ['auto', '*'],
          body: [
            columnLabels(['ID', 'Name']),
            [{ text: person.id, alignment: 'center' }, { text: person.name, font: 'WenQuanYiZenHei', maxHeight: 20 /* See: https://github.com/bpampuch/pdfmake/issues/264#issuecomment-108347567 */ }]
          ]
        }
      },
      {
        margin: [0, 10, 0, 0],
        table: {
          widths: [16, '*', 30, 30], /* Note: 16 (width) + 4 + 4 (defult left and right padding) + 1 (left border) = 25 */
          body: [
            columnLabels(['', 'Result', 'Judge', 'Comp'], { alignment: 'center' }),
            ..._.range(1, maxAttemptsCount + 1)
              .map(attemptNumber => [
                [{ text: attemptNumber, border: [false, false, false, false], fontSize: 20, alignment: 'center', bold: true }, {}, {} ,{}]
              ])
              .reduce((rows1, rows2, attemptsCount) =>
                rows1.concat([[
                  {
                    border: [false, false, false, false], colSpan: 4, margin: [0, 1],
                    columns: (attemptsCount === _.get(cutoff, 'numberOfAttempts') ? [{
                      canvas: [{
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: (pageWidth - 4 * scorecardMargin) / 2, y2: 0,
                        dash: { length: 5 },
                      }]
                    }] : [])
                  }
                ]], rows2)
              ),
            [{ text: 'Extra attempt', border: [false, false, false, false], colSpan: 4, margin: [0, 1], fontSize: 10 }],
            [{ text: '_', border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true }, {}, {}, {}],
            [{ text: '', border: [false, false, false, false], colSpan: 4, margin: [0, 1] }]
          ]
        }
      },
      {
        fontSize: 10,
        columns: [
          cutoff ? { text: `Cutoff: ${cutoffToString(cutoff, eventObject.id)}`, alignment: 'center' } : {},
          timeLimit ? { text: `Time limit: ${timeLimitToString(timeLimit)}`, alignment: 'center' } : {}
        ]
      },
    ]
  }
}
