import _ from 'lodash';

import { ApplicationError } from './errors';

class CubecompsApiError extends ApplicationError {
  get type() { return 'CubecompsApiError'; }
}

export function getCompetitionsInProgress() {
  return cubecompsApiFetch('/competitions')
    .then(competitions => competitions['in_progress']);
}

export function getCompetitionEvents(competitionId) {
  return cubecompsApiFetch(`/competitions/${competitionId}/events`);
}

export function getCompetitionResults(competitionId, eventId, roundId) {
  return cubecompsApiFetch(`/competitions/${competitionId}/events/${eventId}/rounds/${roundId}/results`);
}

function cubecompsApiFetch(path, fetchOptions = {}) {
  const baseApiUrl = `http://m.cubecomps.com`;

  return fetch(`${baseApiUrl}${path}.json`, fetchOptions)
    .then(response => response.ok
      ? response.json()
      : Promise.reject(new CubecompsApiError({ response, message: 'Failed to fetch data from Cubecomps.' }))
    );
}
