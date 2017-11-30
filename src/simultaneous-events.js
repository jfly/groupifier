import _ from 'lodash';

import { eventObjects } from './events';

const eventOptions = eventObjects.map(eventObject => `<option value="${eventObject.id}">${eventObject.name}</option>`);
document.querySelectorAll('.event-selectfield select').forEach(element => {
  element.innerHTML = ['<option value="" selected></option>', ...eventOptions].join('\n');
});

const simultaneousEventsFormRow = document.getElementById('simultaneous-events-form');
const mainEvent = document.getElementById('main-event');
const sideEvent = document.getElementById('side-event');
const addSimultaneousEvents = document.getElementById('add-simultaneous-events');

const selectTagText = element => element.options[element.selectedIndex].innerHTML;

addSimultaneousEvents.addEventListener('click', () => {
  if (mainEvent.value && sideEvent.value) {
    simultaneousEventsFormRow.insertAdjacentHTML('beforebegin', `
      <tr class="simultaneous-events-pair" data-main-event="${mainEvent.value}" data-side-event="${sideEvent.value}">
        <td class="mdl-data-table__cell--non-numeric">${selectTagText(mainEvent)}</td>
        <td class="mdl-data-table__cell--non-numeric">${selectTagText(sideEvent)}</td>
        <td class="mdl-data-table__cell--non-numeric">
          <button type="button" class="mdl-button mdl-js-button mdl-button--icon" onclick="this.parentNode.parentNode.remove()">
            <i class="material-icons">delete</i>
          </button>
        </td>
      </tr>
    `);
    mainEvent.value = sideEvent.value = '';
  }
});

export function sideEventsByMainEvents() {
  const simultaneousEventsRows = document.getElementsByClassName('simultaneous-events-pair');
  return _.fromPairs(_.map(simultaneousEventsRows, row => [row.dataset.mainEvent, row.dataset.sideEvent]));
}
