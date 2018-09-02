import _ from 'lodash';

import { Dialog } from './dialog';
import { ccRoundsToEventsWithData } from '../groups-assignment';
import { ScorecardsPdf } from '../pdfs/scorecards-pdf';

export class ScorecardsDialog extends Dialog {
  constructor(ccCompetition, ccRounds, wcif) {
    super();
    this.dialog.classList.add('scorecards-dialog');
    this.dialog.innerHTML = `
      <h4 class="mdl-dialog__title">Scorecards</h4>
      <div class="mdl-dialog__content">
        <span>
          Print scorecards for subsequent rounds of <span class="competition-name">${ccCompetition.name}</span>.
          This uses Cubecomps data and generates groups according to the scramble set count specified on the WCA website.
        </span>
        <ul class="mdl-list rounds-list">
        ${ccRounds.map((ccRound, index) => `
          <li class="mdl-list__item">
            <span class="mdl-list__item-primary-content">${ccRound.eventObject.name} - ${ccRound.name}</span>
            <span class="mdl-list__item-secondary-action">
              <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="event-round-${index}">
                <input type="checkbox" class="mdl-checkbox__input" id="event-round-${index}" data-index="${index}">
              </label>
            </span>
          </li>
        `).join()}
        </ul>
      </div>
      <div class="mdl-dialog__actions">
        <button type="button" class="mdl-button print">Print</button>
      </div>
    `;
    componentHandler.upgradeElements(this.dialog);
    this.dialog.querySelector('button.print').addEventListener('click', () => {
      const checkboxes = this.dialog.querySelectorAll('input[type="checkbox"]');
      const selectedCcRounds = _(checkboxes)
        .filter('checked')
        .map(checkbox => ccRounds[checkbox.dataset.index])
        .value();
      if (selectedCcRounds.length > 0) {
        ccRoundsToEventsWithData(selectedCcRounds, wcif).then(eventsWithData => {
          new ScorecardsPdf(eventsWithData, wcif).download();
        });
      }
    });
  }
}
