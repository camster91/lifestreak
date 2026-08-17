const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function activeHabitDialog() {
  if (typeof document === 'undefined') return null;
  const dialogs = [...document.querySelectorAll('.habit-dialog[role="dialog"]')];
  return dialogs.at(-1) || null;
}

function markDirty(event) {
  const form = event.target?.closest?.('.habit-form');
  if (form) form.dataset.habitDirty = 'true';
}

function clearDirty(event) {
  const form = event.target?.closest?.('.habit-form');
  if (form) form.dataset.habitDirty = 'false';
}

function hasUnsavedChanges(dialog) {
  return dialog?.querySelector('.habit-form[data-habit-dirty="true"]') != null;
}

function confirmDiscard(dialog) {
  if (!hasUnsavedChanges(dialog)) return true;
  const confirmed = window.confirm('Discard the unsaved habit changes?');
  if (confirmed) {
    const form = dialog.querySelector('.habit-form');
    if (form) form.dataset.habitDirty = 'false';
  }
  return confirmed;
}

function isDialogDismissAction(event, dialog) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.classList.contains('habit-dialog-backdrop')) return true;
  const button = target.closest('button');
  if (!button || !dialog.contains(button)) return false;
  if (button.getAttribute('aria-label') === 'Close dialog') return true;
  return button.textContent?.trim() === 'Cancel';
}

function trapTab(event, dialog) {
  const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  );
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', markDirty, true);
  document.addEventListener('change', markDirty, true);
  document.addEventListener('submit', clearDirty, true);

  document.addEventListener(
    'click',
    (event) => {
      const dialog = activeHabitDialog();
      if (!dialog || !isDialogDismissAction(event, dialog)) return;
      if (confirmDiscard(dialog)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (event) => {
      const dialog = activeHabitDialog();
      if (!dialog) return;

      if (event.key === 'Tab') {
        trapTab(event, dialog);
        return;
      }

      if (event.key === 'Escape' && !confirmDiscard(dialog)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
