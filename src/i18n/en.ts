/**
 * English message bundle. Semantic keys only — never English sentences as
 * keys. Every key here must exist in `sw.ts`; the parity test enforces it.
 */
export const en = {
  common: {
    appName: 'POST',
    appTagline: 'Care that continues after treatment.',
    demoBanner: 'DEMO - SYNTHETIC DATA',
    demoBannerDetail: 'Every person and medical event in this app is synthetic.',
    ok: 'OK',
    cancel: 'Cancel',
    back: 'Back',
    continue: 'Continue',
    notAvailable: 'Not available',
    missingData: 'Missing',
    languageNameEn: 'English',
    languageNameSw: 'Kiswahili',
    languageLabel: 'Language',
    signOut: 'Sign out',
    comingSoonMilestone: 'This screen is built in a later milestone.',
  },
  safety: {
    patientDisclaimer:
      'POST does not provide emergency care or replace your clinician. If you feel seriously unwell, follow the urgent instructions given by your clinic or contact local emergency services.',
    aiOrganizedLabel: 'AI-assisted organization, not a diagnosis or complete medical record',
    pendingClinicalReview: 'FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED',
  },
  auth: {
    welcomeTitle: 'Welcome to POST',
    welcomeBody:
      'POST helps care continue after treatment: short daily check-ins, medication reminders, and a Care Passport you control.',
    chooseLanguage: 'Choose your language',
    signInAsPatient: 'Continue as patient',
    signInAsClinician: 'Continue as clinician',
    demoAccountsHint: 'Development build: seeded demo accounts are used automatically.',
  },
  workflowStatus: {
    on_track: 'On track',
    review: 'Review',
    urgent: 'Urgent',
    workflowNote: 'Workflow priority, not a diagnosis.',
  },
  syncStatus: {
    local: 'Saved on this phone',
    syncing: 'Syncing',
    synced: 'Synced',
    failed: 'Needs attention',
    savedOffline: 'Saved on this phone. It will sync when you are online.',
  },
  sourceLabels: {
    clinician_verified: 'Clinician verified',
    facility_imported: 'Facility imported',
    patient_reported: 'Patient reported',
    ai_organized: 'AI-organized summary',
  },
  verificationLabels: {
    verified: 'Verified',
    pending: 'Verification pending',
    disputed: 'Disputed',
    superseded: 'Superseded',
    unverified: 'Not yet verified',
  },
  patientTabs: {
    today: 'Today',
    progress: 'Progress',
    passport: 'Passport',
    help: 'Help',
    profile: 'Profile',
  },
  patientToday: {
    greeting: 'Hello, {{name}}',
    planDay: 'Day {{day}} of {{total}}',
    startCheckIn: 'Start check-in',
    checkInCompleted: 'Check-in completed',
    medicationTasksTitle: 'Your medicines today',
    noActivePlan: 'No active care plan. Your clinic will assign one at your next visit.',
  },
  patientProgress: {
    title: 'Progress',
    checkInsCompleted: 'Check-ins completed: {{completed}} of {{total}}',
    dosesConfirmed: 'Doses confirmed: {{confirmed}} of {{expected}}',
    discussWithClinician: 'Discuss this with your clinician.',
  },
  passport: {
    title: 'Care Passport',
    lastUpdated: 'Last updated {{date}}',
    notCompleteNote: 'This passport may not include every record from every facility.',
    share: 'Share Care Passport',
    activeSharing: 'Active sharing',
    accessHistory: 'Access history',
    offlineFreshness: 'Viewing a saved copy. May not include recent changes.',
    sections: {
      important_alerts: 'Important',
      medications: 'Current medications',
      allergies: 'Allergies',
      conditions: 'Conditions',
      encounters: 'Recent treatments and visits',
      procedures: 'Procedures',
      care_plans: 'Care plans and advice',
      clinician_advice: 'Clinician advice',
      observations: 'Measurements and results',
      documents: 'Documents',
    },
  },
  help: {
    title: 'Help',
    clinicContact: 'Clinic contact',
    urgentInstructionsTitle: 'Urgent instructions from your clinic',
    privacyTitle: 'Your privacy',
    privacyBody:
      'Your information is used only for your follow-up care. You choose what to share and can revoke sharing at any time.',
  },
  profile: {
    title: 'Profile',
    notifications: 'Notifications',
    consent: 'Consent',
    demoControls: 'Demo controls',
    switchRole: 'Switch role (development only)',
  },
  clinicianTabs: {
    home: 'Home',
    patients: 'Patients',
    reviews: 'Reviews',
    templates: 'Templates',
    profile: 'Profile',
  },
  clinicianHome: {
    title: 'Overview',
    activePlans: 'Active plans',
    dueToday: 'Due today',
    reviewCount: 'Review',
    urgentCount: 'Urgent',
    recentActivity: 'Recent activity',
  },
  clinicianPatients: {
    title: 'Patients',
    searchPlaceholder: 'Search by name or identifier',
    lastCheckIn: 'Last check-in {{date}}',
    noCheckInsYet: 'No check-ins yet',
    openAlerts: '{{count}} open alert',
    openAlerts_other: '{{count}} open alerts',
  },
  reviews: {
    title: 'Review queue',
    emptyState: 'No open review items.',
    reasonLabel: 'Reason',
    evidenceLabel: 'Evidence',
    viewTrace: 'View processing trace',
  },
  templates: {
    title: 'Care-plan templates',
    versionLabel: 'Version {{version}}',
    questionsCount: '{{count}} question',
    questionsCount_other: '{{count}} questions',
    rulesCount: '{{count}} rule',
    rulesCount_other: '{{count}} rules',
  },
  adherence: {
    fraction: '{{confirmed}} confirmed / {{expected}} expected',
    notApplicable: 'No doses expected in this period',
  },
} as const;

/** Same key tree as `en`, with every leaf widened to `string`. */
type DeepMessages<T> = { [K in keyof T]: T[K] extends string ? string : DeepMessages<T[K]> };

export type MessageBundle = DeepMessages<typeof en>;
