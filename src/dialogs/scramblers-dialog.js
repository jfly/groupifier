import _ from 'lodash';

import { Dialog } from './dialog';
import { addEventListenerOnce } from '../helpers';
import { eventObjects } from '../events';
import { ApplicationError } from '../errors';

class AbortError extends ApplicationError {}

export class ScramblersDialog extends Dialog {
  constructor() {
    super();
    this.dialog.classList.add('scramblers-dialog');
    this.dialog.innerHTML = `
      <h4 class="mdl-dialog__title">
        <span>Scramblers</span>
        <span class="icon material-icons" id="scramblers-dialog-help">help</span>
      </h4>
      <div class="mdl-tooltip mdl-tooltip--right" data-mdl-for="scramblers-dialog-help">
        Scroll from top to bottom selecting trusted and fast scramblers.
        <br>Please prefer people from the top of the list.
      </div>
      <div class="mdl-dialog__content">
        <h5 class="event-with-group"></h5>
        <ul class="mdl-list scramblers-list"></ul>
        <span>Scramblers: </span><span class="selected-scramblers-count"></span>
      </div>
      <div class="mdl-dialog__actions">
        <button type="button" class="mdl-button close" disabled>Ready</button>
      </div>
    `;
    this.scramblersList = this.dialog.querySelector('ul.scramblers-list');
    this.readyButton = this.dialog.querySelector('button.close');
  }

  getScramblers(people, requiredCount, eventId, groupId) {
    const eventObject = _.find(eventObjects, { id: eventId });
    const scramblers = [];
    const update = () => {
      this.dialog.querySelector('span.selected-scramblers-count').innerText = scramblers.length;
      this.readyButton.disabled = (scramblers.length !== Math.min(requiredCount, people.length));
    };
    update();
    /* Clear the scramblers list. */
    while(this.scramblersList.lastChild) {
      this.scramblersList.removeChild(this.scramblersList.lastChild);
    }
    this.dialog.querySelector('.event-with-group').innerText = `${eventObject.name} - Group ${groupId}`;
    people.forEach(person => {
      this.scramblersList.insertAdjacentHTML('beforeend', `
        <li class="mdl-list__item">
          <span class="mdl-list__item-primary-content">${person.name}</span>
          <span class="mdl-list__item-secondary-action">
            <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="person-${person.id}">
              <input type="checkbox" class="mdl-checkbox__input" id="person-${person.id}">
            </label>
          </span>
        </li>
      `);
      this.dialog.querySelector(`#person-${person.id}`).addEventListener('change', event => {
        event.target.checked ? scramblers.push(person) : _.pull(scramblers, person);
        update();
      });
    });
    componentHandler.upgradeElements(this.dialog);
    this.show();

    return new Promise((resolve, reject) => {
      this.dialog.addEventListener('close', () => reject(new AbortError()));
      addEventListenerOnce(this.readyButton, 'click', () => resolve(scramblers));
    });
  }
}
