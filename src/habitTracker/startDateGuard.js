import { habitStore } from './store';

const originalUpdateHabit = habitStore.updateHabit.bind(habitStore);

habitStore.updateHabit = (habitId, changes, effectiveDate) => {
  const habit = habitStore.getSnapshot().habits.find((item) => item.id === habitId);
  if (!habit) throw new Error('Habit no longer exists.');

  if (changes?.startDate && changes.startDate !== habit.startDate) {
    throw new Error(
      'The start date cannot be changed after a habit has history. Create a new habit or adjust its schedule prospectively.',
    );
  }

  const { startDate: _unchangedStartDate, ...prospectiveChanges } = changes || {};
  return originalUpdateHabit(habitId, prospectiveChanges, effectiveDate);
};
