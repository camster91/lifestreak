import { habitStore } from './store';

habitStore.reopenOnboarding = () => {
  const exported = habitStore.exportData();
  const nextData = {
    ...exported.data,
    onboarding: {
      completed: false,
      dismissedAt: null,
      ftueSeen: true,
    },
    updatedAt: new Date().toISOString(),
  };

  return habitStore.importData(
    {
      ...exported,
      exportedAt: new Date().toISOString(),
      data: nextData,
    },
    'replace'
  );
};
