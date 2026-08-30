const ONBOARDING_VERSION = 'v2';
const ONBOARDING_PREFIX = `pihub.borrower.onboarding.${ONBOARDING_VERSION}`;

function onboardingStorageKey(userId?: string): string {
  const identity = userId?.trim() || 'anonymous';
  return `${ONBOARDING_PREFIX}.${encodeURIComponent(identity)}`;
}

export function hasCompletedBorrowerOnboarding(userId?: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(onboardingStorageKey(userId)) === 'complete';
  } catch {
    return false;
  }
}

export function markBorrowerOnboardingComplete(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(onboardingStorageKey(userId), 'complete');
  } catch {
    // UI onboarding preference is non-critical. A blocked storage API should not block the workspace.
  }
}
