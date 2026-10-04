import { useEffect, useId, useRef } from 'react';

/**
 * Accessible confirm dialog for HabitTracker and shared surfaces.
 * Replaces window.confirm for in-app destructive actions.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    confirmRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="habit-dialog-backdrop habit-confirm-backdrop" role="presentation">
      <button
        type="button"
        className="habit-confirm-scrim"
        aria-label="Dismiss dialog"
        onClick={onCancel}
      />
      <section
        className="habit-dialog habit-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="habit-icon-button"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="habit-dialog-body">
          {description && (
            <p id={descId} className="habit-confirm-copy">
              {description}
            </p>
          )}
          <div className="habit-dialog-actions">
            <button type="button" className="habit-button habit-button-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className={`habit-button ${tone === 'danger' ? 'habit-button-danger' : 'habit-button-primary'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
