import _ from 'lodash';

/* Workaround, see: https://github.com/bpampuch/pdfmake/issues/910#issuecomment-311824467 */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfMakeFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfMakeFonts.pdfMake.vfs;

import { eventObjects } from './events';
import { cutoffToString, timeLimitToString } from './helpers';

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
      { text: `${person.name}`, bold: true },
      { text: person.wcaId ? `WCA ID: ${person.wcaId}` : " " },
      {
        table: {
          body: [['Event', 'Solving', 'Scrambling', 'Judging'], ...table]
        },
        layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 }
      }
    ];
  });
  /* Force the presence of three cards for each row. */
  while(personalCards.length % 3) {
    personalCards.push([]);
  }
  const documentDefinition = {
    content: _.chunk(personalCards, 3).map(cards => (
      { columns: cards, fontSize: 8, margin: [0, 0, 0, 10] , unbreakable: true }
    )),
    pageMargins: [5, 5, 5, 5]
  };
  return pdfMake.createPdf(documentDefinition);
}

export function createSummaryPdf(eventsWithData) {
  const groupsByEvent = _.mapValues(_.fromPairs(eventsWithData), 'groups');
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
  return pdfMake.createPdf(documentDefinition);
}

export function createScorecardsPdf(eventsWithData, wcif) {
  const groupsByEvent = _.mapValues(_.fromPairs(eventsWithData), 'groups');
  const events = eventObjects.filter(eventObject => groupsByEvent[eventObject.id] && eventObject.id !== '333fm');
  const maxAttemptsCountByFormat = { '1': 1, '2': 2, '3': 3, 'm': 3, 'a': 5 };
  const scorecardMargin = 20;
  const pageWidth = 595;
  const pageHeight = 842;
  const columnLabels = (labels, style = {}) =>
    labels.map(label => _.assign({ border: [false, false, false, false], fontSize: 10, text: label }, style));

  const scorecards = _.flatMap(events, eventObject => {
    let scorecardNumber = _.fromPairs(eventsWithData)[eventObject.id].people.length;
    const wcifEvent = _.find(wcif.events, { id: eventObject.id });
    const firstRound = _.get(wcifEvent.rounds, '0', {});
    const { cutoff, timeLimit } = firstRound;
    const maxAttemptsCount = maxAttemptsCountByFormat[firstRound.format];
    return _.flatMap(groupsByEvent[eventObject.id], group => {
      const groupScorecards = _.map(group.peopleSolving, person =>
        [
          { text: scorecardNumber--, fontSize: 10 },
          { text: wcif.name, bold: true, fontSize: 16, margin: [0, 0, 0, 10], alignment: 'center' },
          {
            margin: [25, 0, 0, 0],
            table: {
              widths: ['*', 'auto', 'auto'],
              body: [
                columnLabels(['Event', 'Round', 'Group']),
                [eventObject.name, { text: '1', alignment: 'center' }, { text: group.id, alignment: 'center' }]
              ]
            }
          },
          {
            margin: [25, 0, 0, 0],
            table: {
              widths: ['auto', '*'],
              body: [
                columnLabels(['ID', 'Name']),
                [{ text: person.id, alignment: 'center' }, { text: person.name, maxHeight: 15 /* See: https://github.com/bpampuch/pdfmake/issues/264#issuecomment-108347567 */ }]
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
              timeLimit ? { text: `DNF Limit: ${timeLimitToString(timeLimit)}`, alignment: 'center' } : {}
            ]
          },
        ]
      );
      const scorecardsOnLastPage = groupScorecards.length % 4;
      return scorecardsOnLastPage === 0 ? groupScorecards : groupScorecards.concat(_.times(4 - scorecardsOnLastPage, _.constant({})));
    });
  });
  const documentDefinition = {
    background: [
      {
        canvas: [
          {
            type: 'line',
            x1: scorecardMargin, y1: pageHeight / 2,
            x2: pageWidth - scorecardMargin, y2: pageHeight / 2,
            lineWidth: 0.1,
            dash: { length: 10 },
            lineColor: '#888888'
          },
          {
            type: 'line',
            x1: pageWidth / 2, y1: scorecardMargin,
            x2: pageWidth / 2, y2:  pageHeight - scorecardMargin,
            lineWidth: 0.1,
            dash: { length: 10 },
            lineColor: '#888888'
          },
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
  return pdfMake.createPdf(documentDefinition);
}
