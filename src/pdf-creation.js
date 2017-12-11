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

export function createScorecardsPdf(eventsWithData, competitionName) {
  const groupsByEvent = _.mapValues(_.fromPairs(eventsWithData), 'groups');
  const events = eventObjects.filter(eventObject => groupsByEvent[eventObject.id]);
  let scorecardNumber = 0;
  const scorecardMargin = 20;
  const pageWidth = 595;
  const pageHeight = 842;
  const scorecards = _.flatMap(events, eventObject =>
      _.flatMap(groupsByEvent[eventObject.id], group =>
        _.map(group.peopleSolving, person =>
          [
            { text: scorecardNumber += 1, fontSize: 10 },
            { text: competitionName, bold: true, fontSize: 16, margin: [0, 0, 0, 10], alignment: 'center' },
            {
              margin: [25, 0, 0, 0],
              table: {
                widths: ['*', 'auto', 'auto'],
                body: [
                  [
                    { border: [false, false, false, false], fontSize: 10, text: 'Event' },
                    { border: [false, false, false, false], fontSize: 10, text: 'Round' },
                    { border: [false, false, false, false], fontSize: 10, text: 'Group' }
                  ],
                  [eventObject.name, { text: '1', alignment: 'center' }, { text: group.id, alignment: 'center' }]
                ]
              }
            },
            {
              margin: [25, 0, 0, 0],
              table: {
                widths: ['auto', '*'],
                body: [
                  [
                    { border: [false, false, false, false], fontSize: 10, text: 'ID' },
                    { border: [false, false, false, false], fontSize: 10, text: 'Name' }
                  ],
                  [{ text: person.id, alignment: 'center' }, person.name]
                ]
              }
            },
            {
              margin: [0, 10, 0, 0],
              table: {
                widths: [16, '*', 30, 30], /* Note: 16 (width) + 4 + 4 (defult left and right padding) + 1 (left border) = 25 */
                body: [
                  [
                    { border: [false, false, false, false], fontSize: 10, text: '' },
                    { border: [false, false, false, false], fontSize: 10, alignment: 'center', text: 'Result' },
                    { border: [false, false, false, false], fontSize: 10, alignment: 'center', text: 'Judge' },
                    { border: [false, false, false, false], fontSize: 10, alignment: 'center', text: 'Comp' }
                  ],
                  [{ border: [false, false, false, false],fontSize: 20, alignment: 'center', bold: true, text: '1' }, {}, {} ,{}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], text: '' }],
                  [{ border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true, text: '2' }, {}, {}, {}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], columns: [
                    {
                      canvas: [
                        {
                          type: 'line',
                          x1: 0, y1: 0,
                          x2: (pageWidth - 4 * scorecardMargin) / 2, y2: 0,
                          lineWidth: 1,
                          dash: { length: 5 },
                        },
                      ]
                    }
                  ]}],
                  [{ border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true, text: '3' }, {}, {}, {}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], text: '' }],
                  [{ border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true, text: '4' }, {}, {}, {}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], text: '' }],
                  [{ border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true, text: '5' }, {}, {}, {}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], text: 'Extra attempt', fontSize: 10 }],
                  [{ border: [false, false, true, false], fontSize: 20, alignment: 'center', bold: true, text: '_' }, {}, {}, {}],
                  [{ border: [false, false, false, false], colSpan: 4, margin: [0, 1], text: '' }]
                ]
              }
            },
            {
              fontSize: 10,
              columns: [
                { text: 'Cutoff: <Cutoff>', alignment: 'center' },
                { text: 'DNF Limit: <Time Limit>', alignment: 'center' }
              ]
            },
          ]
        )
      )
    );
  const documentDefinition = {
    pageMargins: scorecardMargin,
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
    content: {
      layout: {
        vLineColor: '#999999',
        hLineColor: '#999999',
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
