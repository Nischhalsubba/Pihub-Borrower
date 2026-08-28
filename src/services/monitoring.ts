import { trackUiEvent } from './telemetry';

export function initMonitoring(): () => void {
  const onError = (event: ErrorEvent) => {
    trackUiEvent('borrower_runtime_error', {
      errorType: event.error?.name || 'Error',
      source: event.filename ? 'script' : 'window'
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    trackUiEvent('borrower_unhandled_rejection', { errorType: reason instanceof Error ? reason.name : typeof reason });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
