import { Sun, Moon, CloudSun, Menu, Briefcase, Library, TrendingUp } from 'lucide-react';
import DailyTasksSection from '../components/DailyTasksSection';
import PrayerTrackingCard from '../components/PrayerTrackingCard';
import FamilyWorshipCard from '../components/FamilyWorshipCard';
import BibleReadingCard from '../components/BibleReadingCard';
import { useDrawer } from '../hooks/useDrawer';
import PageHeader from '../components/PageHeader';
import useServiceStore from '../stores/serviceStore.js';
import useReadingStore from '../stores/readingStore.js';
import { summarizeReadingProgress } from '../stores/readingStore.js';
import { useNavigate } from 'react-router-dom';

function Home() {
  const today = new Date();
  const greeting = getGreeting();
  const { openDrawer } = useDrawer();
  const navigate = useNavigate();
  const GreetingIcon = greeting.icon;
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const { getWeeklyTotal, weeklyGoal } = useServiceStore();
  const { items: readingItems, quarantinedItems } = useReadingStore();
  const weeklyService = getWeeklyTotal();
  const readingProgress = summarizeReadingProgress(readingItems, quarantinedItems);
  const servicePercent = Math.min((weeklyService / weeklyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title={greeting.text}
        subtitle="Track habits, service, reading, and goals"
        gradient="from-primary via-primary to-secondary"
        titleSize="text-3xl"
        contentClass="pb-10"
        actions={
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-primary-content/70">
              <GreetingIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{formattedDate}</span>
            </div>
            <button
              onClick={openDrawer}
              className="btn btn-ghost btn-sm btn-square text-white/80 hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-4 space-y-5 max-w-2xl">
        {/* Quick Stats */}
        <section className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              This Week
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="card bg-base-100 shadow-md cursor-pointer text-left w-full"
              onClick={() => navigate('/service')}
            >
              <div className="card-body p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-base-content/60">Service</span>
                  <Briefcase className="w-4 h-4 text-success" />
                </div>
                <div className="text-2xl font-bold">{weeklyService.toFixed(1)}h</div>
                <div className="text-xs text-base-content/60">Goal: {weeklyGoal}h</div>
                <div className="w-full bg-base-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-success h-2 rounded-full transition-all"
                    style={{ width: `${servicePercent}%` }}
                  />
                </div>
              </div>
            </button>
            <button
              type="button"
              className="card bg-base-100 shadow-md cursor-pointer text-left w-full"
              onClick={() => navigate('/reading')}
            >
              <div className="card-body p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-base-content/60">Reading</span>
                  <Library className="w-4 h-4 text-warning" />
                </div>
                <div className="text-2xl font-bold">{readingProgress.activeCount}</div>
                <div className="text-xs text-base-content/60">
                  {readingProgress.activeCount === 1 ? 'item in progress' : 'items in progress'}
                </div>
                {readingProgress.percent === null ? (
                  <div className="text-xs text-base-content/60 mt-2">
                    {readingProgress.hasUnknownRecords
                      ? 'Progress unknown — review preserved records'
                      : 'No active reading progress'}
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-base-content/60 mt-2">
                      Average across active items: {readingProgress.percent}%
                    </div>
                    <div
                      className="w-full bg-base-200 rounded-full h-2 mt-1"
                      role="progressbar"
                      aria-label="Average progress across active reading items"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={readingProgress.percent}
                      aria-valuetext={`${readingProgress.percent}% average across ${readingProgress.activeCount} active ${readingProgress.activeCount === 1 ? 'item' : 'items'}`}
                    >
                      <div
                        className="bg-warning h-2 rounded-full transition-all"
                        style={{ width: `${readingProgress.percent}%` }}
                      />
                    </div>
                    {readingProgress.hasUnknownRecords && (
                      <div className="text-xs text-warning mt-1">
                        Some preserved records have unknown progress.
                      </div>
                    )}
                  </>
                )}
              </div>
            </button>
          </div>
        </section>

        {/* Daily Tasks + Prayer */}
        <section className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Today
            </h2>
          </div>
          <div className="space-y-3">
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <DailyTasksSection />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <PrayerTrackingCard />
            </div>
          </div>
        </section>

        {/* Bible Reading */}
        <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              Bible Reading
            </h2>
          </div>
          <BibleReadingCard />
        </section>

        {/* Family Worship */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
              This Week
            </h2>
          </div>
          <FamilyWorshipCard />
        </section>
      </main>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return { text: 'Good Morning', icon: Sun };
  }
  if (hour < 17) {
    return { text: 'Good Afternoon', icon: CloudSun };
  }
  return { text: 'Good Evening', icon: Moon };
}

export default Home;
