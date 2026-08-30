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
  const [open, setOpen] = useState(() => replayRequested || !hasCompletedBorrowerOnboarding(auth.user?.id));
  const returnPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!returnPathRef.current) returnPathRef.current = withoutTourQuery(location.pathname, location.search);
  }, [location.pathname, location.search, open]);

  useEffect(() => {
    if (replayRequested) setOpen(true);
  }, [replayRequested]);

  if (!open) return null;

  const complete = () => {
    markBorrowerOnboardingComplete(auth.user?.id);
    setOpen(false);
    const returnPath = returnPathRef.current || '/';
    returnPathRef.current = null;
    const currentPath = withoutTourQuery(location.pathname, location.search);
    if (currentPath !== returnPath || replayRequested) navigate(returnPath, { replace: true });
  };

  return <BorrowerProductTour onComplete={complete}/>;
}
