import _ from 'lodash';

import { ApplicationError } from './errors';

class CubecompsApiError extends ApplicationError {
  get type() { return 'CubecompsApiError'; }
}

export function getCompetitions() {
  return cubecompsApiFetch('/competitions')
    .then(competitions => _.flatten(_.values(competitions)));
}

export function getCompetitionEvents(competitionId) {
  return cubecompsApiFetch(`/competitions/${competitionId}/events`);
}

export function getCompetitionResults(competitionId, eventId, roundId) {
  return cubecompsApiFetch(`/competitions/${competitionId}/events/${eventId}/rounds/${roundId}/results`);
}

function cubecompsApiFetch(path, fetchOptions = {}) {
  /* We use a proxy server using HTTPS to avoid 'Mixed content' errors.
     See https://johnalcher.me/blog/bypassing-mixed-content-error-in-github-pages */
  const baseApiUrl = `https://cors-anywhere.herokuapp.com/http://m.cubecomps.com`;

  return fetch(`${baseApiUrl}${path}.json`, fetchOptions)
    .then(response => response.ok
      ? response.json()
      : Promise.reject(new CubecompsApiError({ response, message: 'Failed to fetch data from Cubecomps.' }))
    );
}
