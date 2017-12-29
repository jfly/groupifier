import { Dialog } from './dialog';

export class ErrorDialog extends Dialog {
  constructor() {
    super();
    this.dialog.innerHTML = `
      <h4 class="mdl-dialog__title">Error</h4>
      <div class="mdl-dialog__content error-container">
      </div>
      <div class="mdl-dialog__actions">
        <button type="button" class="mdl-button ok-button">Ok</button>
      </div>
    `;
    this.errorContainer = this.dialog.querySelector('.error-container');
    this.okButton = this.dialog.querySelector('.ok-button');
  }

  showError(errorText) {
    this.errorContainer.innerText = errorText;
    this.show();
    this.okButton.addEventListener('click', () => this.close());
  }
}
