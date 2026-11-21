import { useState } from 'react';
import { habitStore } from './store';

const STEPS = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Build habits that fit real life',
    body: 'LifeStreak keeps your routines private on this device — offline-first, no account required.',
  },
  {
    id: 'track',
    eyebrow: 'Stay consistent',
    title: 'Check in when it matters',
    body: 'Mark today complete, log amounts, and review history without spreadsheet noise.',
  },
  {
    id: 'start',
    eyebrow: 'Your start',
    title: 'Begin with a few that matter',
    body: 'Next, pick optional starter templates or create your own. You can change anything later.',
  },
];

/**
 * Crisp 3-step first-time welcome shown once before starter templates.
 */
export default function FtueWelcome() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <section className="habit-ftue" aria-labelledby="ftue-heading">
      <div className="habit-ftue-card habit-enter">
        <p className="habit-eyebrow">{current.eyebrow}</p>
        <h2 id="ftue-heading">{current.title}</h2>
        <p className="habit-ftue-body">{current.body}</p>

        <div className="habit-ftue-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Go to step ${index + 1}`}
              aria-current={index === step ? 'step' : undefined}
              className={index === step ? 'is-active' : ''}
              onClick={() => setStep(index)}
            />
          ))}
        </div>

        <div className="habit-button-row">
          {step > 0 && (
            <button
              type="button"
              className="habit-button habit-button-secondary"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="habit-button habit-button-primary"
            onClick={() => {
              if (isLast) habitStore.completeFtue();
              else setStep((value) => value + 1);
            }}
          >
            {isLast ? 'Choose habits' : 'Continue'}
          </button>
          <button
            type="button"
            className="habit-button habit-button-secondary"
            onClick={() => habitStore.completeFtue()}
          >
            Skip intro
          </button>
        </div>
      </div>
    </section>
  );
}
