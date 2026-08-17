import './habitTracker/hardening';
import './habitTracker/startDateGuard';
import './habitTracker/operationGuard';
import './habitTracker/operationGuard.css';
import HabitTrackerApp from './habitTracker/HabitTrackerApp';
import LegacyApp from './LegacyApp';

function isLegacyMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('legacy') === '1';
}

function openLegacyCollections() {
  const url = new URL(window.location.href);
  url.searchParams.set('legacy', '1');
  window.location.assign(url.toString());
}

function returnToHabits() {
  const url = new URL(window.location.href);
  url.searchParams.delete('legacy');
  url.pathname = '/';
  url.hash = '';
  window.location.assign(url.toString());
}

export default function App() {
  if (isLegacyMode()) {
    return (
      <>
        <button
          type="button"
          onClick={returnToHabits}
          style={{
            position: 'fixed',
            zIndex: 10000,
            top: 'max(12px, env(safe-area-inset-top))',
            right: '12px',
            minHeight: '44px',
            padding: '10px 14px',
            border: '2px solid currentColor',
            borderRadius: '12px',
            color: '#172033',
            background: '#ffffff',
            fontWeight: 800,
            boxShadow: '0 10px 30px rgba(0,0,0,.2)',
            cursor: 'pointer',
          }}
        >
          Back to habits
        </button>
        <LegacyApp />
      </>
    );
  }

  return <HabitTrackerApp onOpenCollections={openLegacyCollections} />;
}
