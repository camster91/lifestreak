import { Component } from 'react';
import { AlertTriangle, Download, RefreshCw, Home, Trash2 } from 'lucide-react';
import { recordDiagnostic } from '../utils/diagnostics';
import { createPortableBackup } from '../utils/portableBackup';
import ConfirmDialog from './ConfirmDialog';

/**
 * Error Boundary component to catch JavaScript errors in child components.
 * Prevents entire app crashes and shows user-friendly error UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryMessage: '',
      showClearConfirm: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.setState({ errorInfo });

    recordDiagnostic('react_boundary', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = async () => {
    try {
      // Clear service worker caches (but not localStorage to preserve user data)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // Reload the page
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  handleClearAllAndReload = () => {
    this.setState({ showClearConfirm: true });
  };

  confirmClearAll = () => {
    localStorage.clear();
    this.setState({ showClearConfirm: false });
    this.handleClearAndReload();
  };

  handleDownloadRecovery = () => {
    try {
      const backup = createPortableBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `lifestreak-recovery-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.setState({ recoveryMessage: 'Recovery backup downloaded.' });
    } catch (error) {
      this.setState({
        recoveryMessage:
          error instanceof Error
            ? `Backup could not be created: ${error.message}`
            : 'Backup could not be created.',
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-base-200 flex items-center justify-center p-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>

              {/* Error Title */}
              <h2 className="text-xl font-bold text-base-content">Something went wrong</h2>

              {/* Error Description */}
              <p className="text-sm text-base-content/70 mt-2">
                The app encountered an unexpected error. Your data is safe, and you can try
                reloading the page.
              </p>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-error">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-3 bg-base-200 rounded-lg text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-6">
                <button onClick={this.handleReload} className="btn btn-primary gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>

                <button onClick={this.handleDownloadRecovery} className="btn btn-outline gap-2">
                  <Download className="w-4 h-4" />
                  Download recovery backup
                </button>

                <button onClick={this.handleGoHome} className="btn btn-outline gap-2">
                  <Home className="w-4 h-4" />
                  Go to Home
                </button>

                <button
                  onClick={this.handleClearAndReload}
                  className="btn btn-ghost btn-sm text-base-content/60"
                >
                  Clear cache and reload
                </button>

                <button
                  onClick={this.handleClearAllAndReload}
                  className="btn btn-ghost btn-xs text-error/60 gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all data & reload
                </button>
              </div>

              {this.state.recoveryMessage && (
                <p role="status" className="text-sm text-base-content/70 mt-3">
                  {this.state.recoveryMessage}
                </p>
              )}

              {/* Support Message */}
              <p className="text-xs text-base-content/50 mt-4">
                Download a recovery backup before clearing data. If this persists, try clearing the
                app cache or reinstalling.
              </p>
            </div>
          </div>
          <ConfirmDialog
            open={this.state.showClearConfirm}
            title="Clear all app data?"
            description="This permanently removes progress, habits, and settings on this device."
            confirmLabel="Clear everything"
            cancelLabel="Keep my data"
            tone="danger"
            onConfirm={this.confirmClearAll}
            onCancel={() => this.setState({ showClearConfirm: false })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
