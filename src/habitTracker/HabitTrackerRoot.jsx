import HabitTrackerApp from './HabitTrackerApp';
import ErrorBoundary from '../components/ErrorBoundary';

export default function HabitTrackerRoot(props) {
  return (
    <ErrorBoundary>
      <HabitTrackerApp {...props} />
    </ErrorBoundary>
  );
}
