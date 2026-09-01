import { afterEach, describe, expect, it, vi } from 'vitest';
import { forceUpdate } from './pwa.js';

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

afterEach(() => {
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
  } else {
    delete navigator.serviceWorker;
  }
});

describe('PWA update activation', () => {
  it('activates a waiting worker without reloading prematurely', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn(async () => [{ waiting: { postMessage } }]),
      },
    });

    expect(await forceUpdate()).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('does nothing when no verified update is waiting', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn(async () => [{ waiting: null }]) },
    });

    expect(await forceUpdate()).toBe(false);
  });
});
