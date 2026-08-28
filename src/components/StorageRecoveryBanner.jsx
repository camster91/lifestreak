import { useEffect, useState } from 'react';
import {
  STORAGE_STATUS_EVENT,
  exportStorageRecovery,
  getLatestStorageFailure,
  retryStorageWrite,
} from '../utils/storageErrorHandler';

function downloadRecovery(storeName) {
  const contents = exportStorageRecovery(storeName);
  if (!contents) return;
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lifestreak-${storeName}-recovery.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function StorageRecoveryBanner() {
  const [failure, setFailure] = useState(() => getLatestStorageFailure());

  useEffect(() => {
    const handleStatus = (event) => {
      if (event.detail?.status === 'recovered') setFailure(null);
      else if (event.detail?.status === 'error') setFailure(event.detail);
    };
    window.addEventListener(STORAGE_STATUS_EVENT, handleStatus);
    return () => window.removeEventListener(STORAGE_STATUS_EVENT, handleStatus);
  }, []);

  if (!failure) return null;
  const canRetry = failure.operation === 'write';

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        zIndex: 11000,
        left: '12px',
        right: '12px',
        top: 'max(12px, env(safe-area-inset-top))',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '14px',
        border: '2px solid #b42318',
        borderRadius: '12px',
        color: '#7a271a',
        background: '#fffbfa',
        boxShadow: '0 10px 30px rgba(0,0,0,.2)',
      }}
    >
      <strong>LifeStreak could not safely save local data.</strong>
      <p style={{ margin: '6px 0' }}>
        Your in-app changes are still open. Free device space or enable site storage, then retry.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {canRetry && (
          <button type="button" onClick={() => retryStorageWrite(failure.storeName)}>
            Retry save
          </button>
        )}
        {failure.recoveryAvailable && (
          <button type="button" onClick={() => downloadRecovery(failure.storeName)}>
            Download recovery data
          </button>
        )}
        <button type="button" onClick={() => setFailure(null)}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
