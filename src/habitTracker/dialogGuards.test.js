import { afterEach, describe, expect, it, vi } from 'vitest';
import './dialogGuards';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function renderDialog() {
  document.body.innerHTML = `
    <div class="habit-dialog-backdrop">
      <section class="habit-dialog" role="dialog">
        <button type="button" aria-label="Close dialog">Close</button>
        <form class="habit-form">
          <input name="name" />
          <button type="button">Cancel</button>
          <button type="submit">Save</button>
        </form>
      </section>
    </div>
  `;
  return {
    form: document.querySelector('.habit-form'),
    input: document.querySelector('input'),
    close: document.querySelector('[aria-label="Close dialog"]'),
    cancel: [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Cancel',
    ),
    save: [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Save',
    ),
  };
}

describe('habit dialog guards', () => {
  it('keeps Tab focus inside the active dialog', () => {
    const { close, save } = renderDialog();
    save.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    save.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
  });

  it('blocks a dismiss action when unsaved changes are not confirmed', () => {
    const { input, cancel } = renderDialog();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const clickHandler = vi.fn();
    cancel.addEventListener('click', clickHandler);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    cancel.dispatchEvent(event);

    expect(window.confirm).toHaveBeenCalledWith('Discard the unsaved habit changes?');
    expect(event.defaultPrevented).toBe(true);
    expect(clickHandler).not.toHaveBeenCalled();
  });

  it('keeps the form dirty after a submit event until a successful save closes it', () => {
    const { form, input, cancel } = renderDialog();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    cancel.dispatchEvent(event);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('allows a dismiss action after the user confirms', () => {
    const { input, close } = renderDialog();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const clickHandler = vi.fn();
    close.addEventListener('click', clickHandler);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    close.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });
});
