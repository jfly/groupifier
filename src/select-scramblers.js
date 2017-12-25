import dialogPolyfill from 'dialog-polyfill';
import _ from 'lodash';

import { $ } from './helpers';
import { eventObjects } from './events';

const dialog = $('dialog');
const readyButton = dialog.querySelector('button');
const list = dialog.querySelector('ul');

dialogPolyfill.registerDialog(dialog);

export function selectScramblers(people, requiredCount, eventId, groupId) {
  const eventObject = _.find(eventObjects, ['id', eventId]);
  const scramblers = [];
  const updateSelectedCount = () => $('.selected-scramblers-count').innerText = scramblers.length;
  updateSelectedCount();
  /* Remove current list items. */
  while(list.lastChild) {
    list.removeChild(list.lastChild);
  }
  if(!dialog.open) {
    dialog.showModal();
  }
  $('.event-with-group').innerText = `${eventObject.name} - Group ${groupId}`;
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
