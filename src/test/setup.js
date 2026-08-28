import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageValues = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => localStorageValues.get(key) ?? null),
  setItem: vi.fn((key, value) => localStorageValues.set(key, String(value))),
  clear: vi.fn(() => localStorageValues.clear()),
  removeItem: vi.fn((key) => localStorageValues.delete(key)),
};
global.localStorage = localStorageMock;

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

// Mock Service Worker
global.navigator.serviceWorker = {
  ready: Promise.resolve({
    showNotification: vi.fn(),
  }),
};

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageValues.clear();
  localStorageMock.getItem.mockImplementation((key) => localStorageValues.get(key) ?? null);
  localStorageMock.setItem.mockImplementation((key, value) =>
    localStorageValues.set(key, String(value))
  );
  localStorageMock.removeItem.mockImplementation((key) => localStorageValues.delete(key));
});
