"use client";

import { useEffect, useState } from "react";
import { SpotlightTour } from "./SpotlightTour";
import {
  WelcomeModal,
  WELCOME_LOCAL_STORAGE_KEY,
} from "./WelcomeModal";

// Orchestrates the two member-first-load surfaces so they never
// overlap: the 3-slide WelcomeModal runs first when
// onboarding_completed=false, then the SpotlightTour takes over when
// first_login_completed=false. The localStorage hint keeps the modal
// from re-triggering on every reload while the backend
// onboarding_completed field is still being shipped.

interface Props {
  displayName: string | null;
  showWelcome: boolean;
  showTour: boolean;
}

export function OnboardingExperience({
  displayName,
  showWelcome,
  showTour,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!showWelcome) return;
    try {
      const seen = localStorage.getItem(WELCOME_LOCAL_STORAGE_KEY) === "true";
      if (!seen) setWelcomeOpen(true);
    } catch {
      setWelcomeOpen(true);
    }
  }, [showWelcome]);

  if (!mounted) return null;

  if (welcomeOpen) {
    return (
      <WelcomeModal
        displayName={displayName}
        onClose={() => setWelcomeOpen(false)}
      />
    );
  }

  if (showTour) {
    return <SpotlightTour displayName={displayName} />;
  }

  return null;
}
