import './habitTracker/hardening';
import './habitTracker/startDateGuard';
import './habitTracker/onboardingGuard';
import './habitTracker/operationGuard';
import './habitTracker/dialogGuards';
import './habitTracker/operationGuard.css';
import HabitTrackerRoot from './habitTracker/HabitTrackerRoot';
import LegacyApp from './LegacyApp';
import StorageRecoveryBanner from './components/StorageRecoveryBanner';
import OfflineIndicator from './components/OfflineIndicator';
import UpdatePrompt from './components/UpdatePrompt';
import InstallPrompt from './components/InstallPrompt';

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
        <StorageRecoveryBanner />
        <button type="button" onClick={returnToHabits} className="app-mode-switch">
          Back to habits
        </button>
        <LegacyApp />
      </>
    );
  }

  return (
    <>
      <OfflineIndicator />
      <UpdatePrompt />
      <HabitTrackerRoot onOpenCollections={openLegacyCollections} />
      <InstallPrompt />
    </>
  );
}
