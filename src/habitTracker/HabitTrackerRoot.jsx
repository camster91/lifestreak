import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HabitTrackerApp from './HabitTrackerApp';
import { habitStore, useHabitState } from './store';
import './onboardingGuard.css';

function DismissedOnboardingPanel({ target }) {
  if (!target) return null;

  return createPortal(
    <section className="habit-dismissed-onboarding" aria-labelledby="dismissed-onboarding-heading">
      <p className="habit-eyebrow">Nothing configured</p>
      <h2 id="dismissed-onboarding-heading">No habits yet</h2>
      <p>
        Starter suggestions are hidden. Use Add habit to create your own routine, or show the optional templates again.
      </p>
      <button
        type="button"
        className="habit-button habit-button-secondary"
        onClick={() => habitStore.reopenOnboarding()}
      >
        Show starter suggestions
      </button>
    </section>,
    target,
  );
}

export default function HabitTrackerRoot(props) {
  const snapshot = useHabitState();
  const [portalTarget, setPortalTarget] = useState(null);
  const suggestionsDismissed =
    snapshot.habits.length === 0 && Boolean(snapshot.onboarding?.completed);

  useEffect(() => {
    setPortalTarget(document.getElementById('habit-main'));
  }, [suggestionsDismissed]);

  return (
    <div className={suggestionsDismissed ? 'habit-onboarding-dismissed' : undefined}>
      <HabitTrackerApp {...props} />
      {suggestionsDismissed && <DismissedOnboardingPanel target={portalTarget} />}
    </div>
  );
}
