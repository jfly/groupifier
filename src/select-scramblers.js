import dialogPolyfill from 'dialog-polyfill';

const readyButton = document.getElementsByTagName('dialog')[0].getElementsByTagName('button')[0];
const list = document.getElementsByTagName('ul')[0];
const dialog = document.getElementsByTagName('dialog')[0];

dialogPolyfill.registerDialog(dialog);

readyButton.addEventListener('click', () => {
  dialog.close();
  readyButton.disabled = true;
});

export function selectScramblers(people, requiredCount) {
  const scramblers = [];
  /* Remove current list items. */
  while(list.lastChild) {
    list.removeChild(list.lastChild);
  }
  if(!dialog.open) {
    dialog.showModal();
  }
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
      readyButton.disabled = !(scramblers.length === requiredCount);
    });
  });

  return new Promise((resolve, reject) => {
    const handler = readyButton.addEventListener('click', event => {
      readyButton.removeEventListener('click', handler);
      resolve(scramblers);
    });
  });
}
