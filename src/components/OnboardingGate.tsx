import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { hasCompletedBorrowerOnboarding, markBorrowerOnboardingComplete } from '../onboarding';
import { BorrowerProductTour } from '../pages/OnboardingPage';

function withoutTourQuery(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete('tour');
  const nextSearch = params.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`;
}

export function OnboardingGate() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const replayRequested = new URLSearchParams(location.search).get('tour') === '1';
  const automaticTourDisabled = (import.meta.env as { VITE_DISABLE_AUTO_TOUR?: string }).VITE_DISABLE_AUTO_TOUR === 'true';
  // The public demo is a repeatable walkthrough environment. A fresh demo login should
  // always present the tour, while real API users retain per-version completion state.
  const shouldAutoOpen = !automaticTourDisabled && (auth.mode === 'demo' || !hasCompletedBorrowerOnboarding(auth.user?.id));
  const [open, setOpen] = useState(() => replayRequested || shouldAutoOpen);
  const returnPathRef = useRef(withoutTourQuery(location.pathname, location.search));
  const previousReplayRef = useRef(replayRequested);

  useEffect(() => {
    if (replayRequested && !previousReplayRef.current) {
      returnPathRef.current = withoutTourQuery(location.pathname, location.search);
      setOpen(true);
    } else if (replayRequested) {
      setOpen(true);
    }
    previousReplayRef.current = replayRequested;
  }, [location.pathname, location.search, replayRequested]);

  if (!open) return null;

  const complete = () => {
    markBorrowerOnboardingComplete(auth.user?.id);
    setOpen(false);
    const returnPath = returnPathRef.current || '/';
    const currentPath = withoutTourQuery(location.pathname, location.search);
    if (currentPath !== returnPath || replayRequested) navigate(returnPath, { replace: true });
  };

  return <BorrowerProductTour onComplete={complete}/>;
}
