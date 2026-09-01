import { useEffect, useState, useRef } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore.js';
import { haptics } from '../utils/native.js';

// Confetti particle component
interface ConfettiParticleProps {
  delay: number;
  color: string;
  left: number;
}

function ConfettiParticle({ delay, color, left }: ConfettiParticleProps) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// Generate random confetti colors
const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#A78BFA', // Purple
  '#FB923C', // Orange
  '#34D399', // Green
];

interface Particle {
  id: number;
  delay: number;
  color: string;
  left: number;
}

function AchievementPopup() {
  const { recentAchievements, clearRecentAchievements, getLevel } = useGamificationStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const currentAchievement = recentAchievements[currentIndex];
  const level = getLevel();
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentAchievement) {
      setParticles(
        Array.from({ length: 20 }, (_, i): Particle => ({
          id: i,
          delay: i * 50,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#FFD700',
          left: Math.random() * 100,
        }))
      );
    }
  }, [currentAchievement]);

  useEffect(() => {
    if (recentAchievements.length > 0 && !isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        haptics.success();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [recentAchievements, isVisible]);

  useEffect(() => {
    if (!isVisible || !overlayRef.current) return undefined;
    const overlay = overlayRef.current;
    const siblings = [...(overlay.parentElement?.children ?? [])].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay
    );
    const priorInert = siblings.map((element) => element.inert);
    siblings.forEach((element) => {
      element.inert = true;
    });
    overlay.querySelector<HTMLElement>('[aria-label="Dismiss achievement dialog"]')?.focus();
    return () => {
      siblings.forEach((element, index) => {
        element.inert = priorInert[index] ?? false;
      });
    };
  }, [isVisible]);

  const handleNext = () => {
    haptics.light();
    if (currentIndex < recentAchievements.length - 1) {
      setIsExiting(true);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsExiting(false);
        haptics.success();
      }, 200);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    haptics.light();
    setIsExiting(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setCurrentIndex(0);
      setIsExiting(false);
      clearRecentAchievements();
    }, 300);
  };

  if (!isVisible || !currentAchievement) {
    return null;
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close achievement"
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            color={particle.color}
            left={particle.left}
          />
        ))}
      </div>

      {/* Achievement card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-heading"
        className={`relative bg-linear-to-br from-warning via-warning to-warning/70 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all duration-300 ${
          isExiting ? 'scale-90 opacity-0' : 'animate-achievement-pop'
        }`}
      >
        <button
          type="button"
          aria-label="Dismiss achievement dialog"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 btn btn-ghost btn-circle min-h-11 min-w-11 text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white/90 font-semibold tracking-wide uppercase text-sm">
              Achievement Unlocked!
            </span>
            <Star className="w-5 h-5 text-white animate-pulse" />
          </div>

          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce-subtle">
              <span className="text-5xl animate-wiggle">{currentAchievement.icon}</span>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping-slow" />
          </div>

          <h2
            id="achievement-heading"
            className="text-2xl font-bold text-white mb-2 animate-fade-in-up"
          >
            {currentAchievement.name}
          </h2>

          <p className="text-white/80 mb-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {currentAchievement.description}
          </p>

          {currentAchievement.points > 0 && (
            <div
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              <Trophy className="w-5 h-5 text-warning-content" />
              <span className="text-white font-bold">+{currentAchievement.points} points</span>
            </div>
          )}

          <div
            className="text-white/70 text-sm mb-6 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            Level {level}
          </div>

          <div
            className="flex gap-3 justify-center animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            {recentAchievements.length > 1 && (
              <div className="text-white/60 text-sm self-center">
                {currentIndex + 1} of {recentAchievements.length}
              </div>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="btn min-h-11 bg-base-100 text-warning hover:bg-base-100/90 border-none shadow-lg"
            >
              {currentIndex < recentAchievements.length - 1 ? 'Next' : 'Awesome!'}
            </button>
          </div>
        </div>
        <div className="h-2 bg-linear-to-r from-warning/60 via-warning to-warning/70" />
      </div>
    </div>
  );
}

export default AchievementPopup;
