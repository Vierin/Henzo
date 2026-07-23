/** Mirrors `homepage.studio` in each locale’s `public/homepage.json`. */
export type StudioSpotlightSlide = {
  stat: string;
  featureTitle: string;
  description: string;
  videoSrc: string;
  videoLabel: string;
  scribbleMain?: string;
  scribbleSub?: string;
};

export type StudioLandingContent = {
  hero: {
    availableForFree: string;
    line1Lead: string;
    line1Highlight: string;
    line1Trail: string;
    line2Lead: string;
    line2Highlight: string;
    line2Trail: string;
    storeAppStore: string;
    storeGooglePlay: string;
    notification: string;
    newClientsTitle: string;
    newBadge: string;
    clientsBadge: string;
    autoBadge: string;
    notificationBadge: string;
    activeUserLabel: string;
    clients: Array<{ name: string; initials: string }>;
  };
  intro: {
    description: string;
    secondary: string;
  };
  spotlight: {
    headingLine1: string;
    line2BeforeAccent: string;
    line2Accent: string;
    slides: StudioSpotlightSlide[];
  };
  quickStart: {
    line1: string;
    line2Before: string;
    line2Accent: string;
    steps: Array<{ label: string; text: string }>;
  };
  pricing: {
    titleLine1: string;
    titleLine2Before?: string;
    titleLine2Accent: string;
    titleLine2After?: string;
    currency: string;
    /** English landing: used when `?currency=eur` is present. */
    currencyEuro?: string;
    storeAppStore: string;
    storeGooglePlay: string;
    plans: Array<{
      name: string;
      subtitle: string;
      price: string;
      priceSub: string;
      features: string[];
    }>;
    /** English landing euro override plans (`?currency=eur`). */
    plansEuro?: Array<{
      name: string;
      subtitle: string;
      price: string;
      priceSub: string;
      features: string[];
    }>;
  };
  features: {
    title: string;
    items: Array<{ title: string; description: string }>;
  };
  workflow: {
    title: string;
    steps: Array<{ title: string; description: string }>;
  };
  finalCta: {
    title: string;
    description: string;
    androidCta: string;
    iosCta: string;
    contactCta: string;
  };
  footer: {
    navBenefits: string;
    navPricing: string;
    navHowItWorks: string;
    ctaTitle: string;
    copyright: string;
    email: string;
  };
};
