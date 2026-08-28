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
  const storageAccessBlocked = failure.operation === 'read' || failure.operation === 'storage';

  return (
    <aside role="alert" aria-live="assertive" className="storage-recovery-banner">
      <strong>
        {storageAccessBlocked
          ? 'LifeStreak cannot access local data.'
          : 'LifeStreak could not safely save local data.'}
      </strong>
      <p>
        {storageAccessBlocked
          ? 'Enable site storage or leave private browsing, then retry. LifeStreak will not treat inaccessible data as empty.'
          : 'Your in-app changes are still open. Free device space or enable site storage, then retry.'}
      </p>
      <div className="storage-recovery-actions">
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
        {storageAccessBlocked && (
          <button type="button" onClick={() => window.location.reload()}>
            Retry after enabling storage
          </button>
        )}
      </div>
    </aside>
  );
}
