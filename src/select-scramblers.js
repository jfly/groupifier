import dialogPolyfill from 'dialog-polyfill';
import _ from 'lodash';

import { eventObjects } from './events';

const dialog = document.getElementsByTagName('dialog')[0];
const readyButton = dialog.getElementsByTagName('button')[0];
const eventWithGroupHeader = dialog.getElementsByClassName('event-with-group')[0];
const list = dialog.getElementsByTagName('ul')[0];
const selectedScramblersCountSpan = dialog.getElementsByClassName('selected-scramblers-count')[0];

dialogPolyfill.registerDialog(dialog);

export function selectScramblers(people, requiredCount, eventId, groupId) {
  const eventObject = _.find(eventObjects, ['id', eventId]);
  const scramblers = [];
  const updateSelectedCount = () => selectedScramblersCountSpan.innerText = scramblers.length;
  updateSelectedCount();
  /* Remove current list items. */
  while(list.lastChild) {
    list.removeChild(list.lastChild);
  }
  if(!dialog.open) {
    dialog.showModal();
  }
  eventWithGroupHeader.innerText = `${eventObject.name} - Group ${groupId}`;
  people.forEach(person => {
    list.insertAdjacentHTML('beforeend', `
      <li class="mdl-list__item">
        <span class="mdl-list__item-primary-content">
          ${person.name}
        </span>
        <span class="mdl-list__item-secondary-action">
          <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="${person.name}">
            <input type="checkbox" class="mdl-checkbox__input" id="${person.name}">
          </label>
        </span>
      </li>
    `);
    componentHandler.upgradeAllRegistered();
    document.getElementById(person.name).addEventListener('change', event => {
      if(event.target.checked) {
        scramblers.push(person);
      } else {
        _.pull(scramblers, person);
      }
      updateSelectedCount();
      readyButton.disabled = !(scramblers.length === requiredCount);
    });
  });

  return new Promise((resolve, reject) => {
    const closeHandler = () => {
      removeHandlers();
      reject();
    };
    const handler = () => {
      removeHandlers();
      dialog.close();
      readyButton.disabled = true;
      resolve(scramblers);
    };
    function removeHandlers() {
      readyButton.removeEventListener('click', handler);
      dialog.removeEventListener('close', closeHandler);
    }
    dialog.addEventListener('close', closeHandler);
    readyButton.addEventListener('click', handler);
  });
}
