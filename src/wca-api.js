import _ from 'lodash';

const wcaOrigin = WCA_ORIGIN_URL;
const wcaOAuthClientId = WCA_OAUTH_CLIENT_ID;

saveAccessTokenFromHash();
let wcaAccessToken = localStorage.getItem('Groupifier.accessToken');

export function signIn() {
  const redirectUri = _.trimEnd(window.location.href, '/');
  window.location = `${wcaOrigin}/oauth/authorize?client_id=${wcaOAuthClientId}&response_type=token&redirect_uri=${redirectUri}&scope=manage_competitions`;
}

export function signOut() {
  localStorage.removeItem('Groupifier.accessToken');
  wcaAccessToken = null;
}

export function isSignedIn() {
  return !!wcaAccessToken;
}

export function getUpcomingManageableCompetitions() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return wcaApiFetch(`/competitions?managed_by_me=true&start=${oneWeekAgo.toISOString()}`)
    .then(response => response.json());
}

export function getPeopleData(allWcaIds) {
  const promises = _.map(_.chunk(allWcaIds, 100), wcaIds =>
    wcaApiFetch(`/persons?per_page=100&wca_ids=${wcaIds.join(',')}`)
      .then(response => response.json())
  );
  return Promise.all(promises).then(_.flatten);
}

export function getCompetitionWcif(competitionId) {
  return wcaApiFetch(`/competitions/${competitionId}/wcif`).then(response => response.json());
}

function saveAccessTokenFromHash() {
  const hash = _.trimStart(window.location.hash, '#');
  const hashParams = new URLSearchParams(hash);
  if (hashParams.has('access_token')) {
    localStorage.setItem('Groupifier.accessToken', hashParams.get('access_token'));
    history.replaceState({}, document.title, '.');
  }
}

function wcaApiFetch(path, fetchOptions) {
  const baseApiUrl = `${wcaOrigin}/api/v0`;

  return fetch(`${baseApiUrl}${path}`, _.assign({}, fetchOptions, {
    headers: new Headers({
      'Authorization': `Bearer ${wcaAccessToken}`,
      'Content-Type': 'application/json'
    })
  }));
}
