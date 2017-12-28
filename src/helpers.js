import _ from 'lodash';

import { eventObjects } from './events';

/* DOM elements */

export const $ = document.querySelector.bind(document);
export const $all = document.querySelectorAll.bind(document);

export function addEventListenerOnce(element, eventName, callback) {
  element.addEventListener(eventName, () => {
    element.removeEventListener(eventName, callback);
    callback();
  });
};

/* WCA formatting */

export function cutoffToString(cutoff, eventId) {
  if (eventId === '333mbf') {
    return `${multibldAttemptResultToPoints(cutoff.attemptResult)} points`;
  } else if (eventId === '333fm') {
    return `${cutoff.attemptResult} moves`;
  } else {
    return centisecondsToClockFormat(cutoff.attemptResult);
  }
}

export function timeLimitToString(timeLimit) {
  const clockFormat = centisecondsToClockFormat(timeLimit.centiseconds);
  switch (timeLimit.cumulativeRoundIds.length) {
    case 0:
      return clockFormat;
    case 1:
      return `${clockFormat} in total`;
    default:
      const rounds = timeLimit.cumulativeRoundIds.map(roundId =>
        roundId.replace(/^([^-]+)-r([^-]+)$/, (match, eventId, roundNumber) =>
          `${_.find(eventObjects, { id: eventId }).shortName} R${roundNumber}`
        )
      );
      return `${clockFormat} total for ${rounds.join(', ')}`;
  }
}

function multibldAttemptResultToPoints(attemptResult) {
  return 99 - (Math.floor(attemptResult / 10000000) % 100);
}

function centisecondsToClockFormat(centiseconds) {
  const date = new Date(null);
  date.setMilliseconds(centiseconds * 10);
  return date.toISOString().substr(11, 11).replace(/^[0:]*(?!\.)/g, '');
}
