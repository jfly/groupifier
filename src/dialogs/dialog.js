import dialogPolyfill from 'dialog-polyfill';

export class Dialog {
  constructor() {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'mdl-dialog';
    this.dialog.addEventListener('close', () => this.dialog.remove());
    document.body.appendChild(this.dialog);
    dialogPolyfill.registerDialog(this.dialog);
  }

  close() {
    return new Promise(resolve => {
      if (this.dialog.open) {
        this.dialog.addEventListener('close', resolve);
        this.dialog.close();
      } else {
        resolve();
      }
    });
  }

  show() {
    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }
}
