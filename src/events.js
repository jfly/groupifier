export const eventObjects = [
  { id: '333',    name: '3x3x3 Cube',         shortName: '3x3',   maxAttemptsCount: 5 },
  { id: '222',    name: '2x2x2 Cube',         shortName: '2x2',   maxAttemptsCount: 5 },
  { id: '444',    name: '4x4x4 Cube',         shortName: '4x4',   maxAttemptsCount: 5 },
  { id: '555',    name: '5x5x5 Cube',         shortName: '5x5',   maxAttemptsCount: 5 },
  { id: '666',    name: '6x6x6 Cube',         shortName: '6x6',   maxAttemptsCount: 3 },
  { id: '777',    name: '7x7x7 Cube',         shortName: '7x7',   maxAttemptsCount: 3 },
  { id: '333bf',  name: '3x3x3 Blindfolded',  shortName: '3BLD',  maxAttemptsCount: 3 },
  { id: '333fm',  name: '3x3x3 Fewest Moves', shortName: 'FMC',   maxAttemptsCount: 3 },
  { id: '333oh',  name: '3x3x3 One-Handed',   shortName: '3OH',   maxAttemptsCount: 5 },
  { id: '333ft',  name: '3x3x3 With Feet',    shortName: '3WF',   maxAttemptsCount: 3 },
  { id: 'minx',   name: 'Megaminx',           shortName: 'Minx',  maxAttemptsCount: 5 },
  { id: 'pyram',  name: 'Pyraminx',           shortName: 'Pyra' , maxAttemptsCount: 5 },
  { id: 'clock',  name: 'Clock',              shortName: 'Clock', maxAttemptsCount: 5 },
  { id: 'skewb',  name: 'Skewb',              shortName: 'Skewb', maxAttemptsCount: 5 },
  { id: 'sq1',    name: 'Square-1',           shortName: 'Sq1',   maxAttemptsCount: 5 },
  { id: '444bf',  name: '4x4x4 Blindfolded',  shortName: '4BLD',  maxAttemptsCount: 3 },
  { id: '555bf',  name: '5x5x5 Blindfolded',  shortName: '5BLD',  maxAttemptsCount: 3 },
  { id: '333mbf', name: '3x3x3 Multi-Blind',  shortName: 'MBLD',  maxAttemptsCount: 3 }
];

/* These events consist of a single group and doesn't require assigning scramblers and judges. */
export const selfsufficientEvents = ['333fm', '444bf', '555bf', '333mbf'];
