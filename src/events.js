import _ from 'lodash';

import { ApplicationError } from './errors';

export const eventObjects = [
  { id: '333',    name: '3x3x3 Cube',         shortName: '3x3'   },
  { id: '222',    name: '2x2x2 Cube',         shortName: '2x2'   },
  { id: '444',    name: '4x4x4 Cube',         shortName: '4x4'   },
  { id: '555',    name: '5x5x5 Cube',         shortName: '5x5'   },
  { id: '666',    name: '6x6x6 Cube',         shortName: '6x6'   },
  { id: '777',    name: '7x7x7 Cube',         shortName: '7x7'   },
  { id: '333bf',  name: '3x3x3 Blindfolded',  shortName: '3BLD'  },
  { id: '333fm',  name: '3x3x3 Fewest Moves', shortName: 'FMC'   },
  { id: '333oh',  name: '3x3x3 One-Handed',   shortName: '3OH'   },
  { id: '333ft',  name: '3x3x3 With Feet',    shortName: '3WF'   },
  { id: 'minx',   name: 'Megaminx',           shortName: 'Minx'  },
  { id: 'pyram',  name: 'Pyraminx',           shortName: 'Pyra'  },
  { id: 'clock',  name: 'Clock',              shortName: 'Clock' },
  { id: 'skewb',  name: 'Skewb',              shortName: 'Skewb' },
  { id: 'sq1',    name: 'Square-1',           shortName: 'Sq1'   },
  { id: '444bf',  name: '4x4x4 Blindfolded',  shortName: '4BLD'  },
  { id: '555bf',  name: '5x5x5 Blindfolded',  shortName: '5BLD'  },
  { id: '333mbf', name: '3x3x3 Multi-Blind',  shortName: 'MBLD'  }
];

/* These events consist of a single group and doesn't require assigning scramblers and judges. */
export const selfsufficientEvents = ['333fm', '444bf', '555bf', '333mbf'];

/* WCIF stuff */

class IncompleteWcifError extends ApplicationError {
  get type() { return 'IncompleteWcifError'; }
}

export function validateEventsWcif(wcif, csvEventIds) {
  csvEventIds.forEach(eventId => {
    const wcifEvent = _.find(wcif.events, { id: eventId });
    const eventName = _.find(eventObjects, { id: eventId }).name;
    if (!wcifEvent) {
      throw new IncompleteWcifError({ message: `Missing event: ${eventName}.` });
    } else if (wcifEvent.rounds.length === 0) {
      throw new IncompleteWcifError({ message: `No rounds specified for ${eventName}.` });
    }
    _.initial(wcifEvent.rounds).forEach(wcifRound => {
      const [, roundNumber] = wcifRound.id.match(/^\w+-r(\d+)$/);
      if (!wcifRound.advancementCondition) {
        throw new IncompleteWcifError({ message: `Mising advancement condition for ${eventName} Round ${roundNumber}.` });
      }
    });
  });
}
