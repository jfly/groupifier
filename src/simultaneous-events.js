import _ from 'lodash';

import { $, $all } from './helpers';
import { eventObjects } from './events';

const eventOptions = eventObjects.map(eventObject => `<option value="${eventObject.id}">${eventObject.name}</option>`);
$all('.event-selectfield select').forEach(element => {
  element.innerHTML = ['<option value="" selected></option>', ...eventOptions].join('\n');
});

const mainEvent = $('#main-event');
const sideEvent = $('#side-event');
const selectTagText = element => element.options[element.selectedIndex].innerHTML;

$('#add-simultaneous-events').addEventListener('click', () => {
  if (mainEvent.value && sideEvent.value) {
    $('#simultaneous-events-form').insertAdjacentHTML('beforebegin', `
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
  const simultaneousEventsRows = $all('.simultaneous-events-pair');
  return _.fromPairs(_.map(simultaneousEventsRows, row => [row.dataset.mainEvent, row.dataset.sideEvent]));
}
