import _ from 'lodash';

const wcaOrigin = 'https://staging.worldcubeassociation.org';
const wcaOAuthClientId = '13981de47748e4687c107d56417e79f11c45f90aa65504e0a6c26a50c3a0fbd9';

saveAccessTokenFromHash();
let wcaAccessToken = localStorage.getItem('Groupifier.accessToken');

export function signIn() {
  window.location = `${wcaOrigin}/oauth/authorize?client_id=${wcaOAuthClientId}&response_type=token&redirect_uri=${window.location.origin}&scope=manage_competitions`;
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
      'Content-Type': 'application/json',
    })
  }));
}
