/**
 * Kiswahili message bundle — a first-class language, not an afterthought.
 *
 * Wording is plain, respectful Tanzanian Kiswahili, PROVISIONAL until a
 * fluent Kiswahili speaker and the qualified doctor review it
 * (docs/CLINICAL_REVIEW.md records reviewer, date, and content version).
 * Medication names are never translated; only surrounding instructions are.
 */
import type { MessageBundle } from './en';

export const sw: MessageBundle = {
  common: {
    appName: 'POST',
    appTagline: 'Huduma inayoendelea baada ya matibabu.',
    demoBanner: 'MAONYESHO - DATA YA KUBUNI',
    demoBannerDetail: 'Kila mtu na tukio la matibabu katika programu hii ni ya kubuni.',
    ok: 'Sawa',
    cancel: 'Ghairi',
    back: 'Rudi',
    continue: 'Endelea',
    notAvailable: 'Haipatikani',
    missingData: 'Haipo',
    languageNameEn: 'English',
    languageNameSw: 'Kiswahili',
    languageLabel: 'Lugha',
    signOut: 'Toka',
    comingSoonMilestone: 'Skrini hii itajengwa katika hatua inayofuata.',
  },
  safety: {
    patientDisclaimer:
      'POST haitoi huduma za dharura wala haichukui nafasi ya tabibu wako. Ukijisikia mgonjwa sana, fuata maelekezo ya dharura uliyopewa na kliniki yako au wasiliana na huduma za dharura za eneo lako.',
    aiOrganizedLabel: 'Mpangilio uliosaidiwa na AI, si utambuzi wala kumbukumbu kamili ya matibabu',
    pendingClinicalReview: 'KWA MAONYESHO - INAHITAJI MAPITIO YA KITABIBU',
  },
  auth: {
    welcomeTitle: 'Karibu POST',
    welcomeBody:
      'POST husaidia huduma kuendelea baada ya matibabu: taarifa fupi za kila siku, vikumbusho vya dawa, na Pasipoti ya Huduma unayoidhibiti mwenyewe.',
    chooseLanguage: 'Chagua lugha yako',
    signInAsPatient: 'Endelea kama mgonjwa',
    signInAsClinician: 'Endelea kama tabibu',
    demoAccountsHint: 'Toleo la majaribio: akaunti za mfano zinatumika moja kwa moja.',
  },
  workflowStatus: {
    on_track: 'Inaendelea vizuri',
    review: 'Inahitaji mapitio',
    urgent: 'Dharura',
    workflowNote: 'Kipaumbele cha kazi, si utambuzi wa ugonjwa.',
  },
  syncStatus: {
    local: 'Imehifadhiwa kwenye simu hii',
    syncing: 'Inatumwa',
    synced: 'Imetumwa',
    failed: 'Inahitaji kuangaliwa',
    savedOffline: 'Imehifadhiwa kwenye simu hii. Itatumwa mtandao ukipatikana.',
  },
  sourceLabels: {
    clinician_verified: 'Imethibitishwa na tabibu',
    facility_imported: 'Imeingizwa kutoka kituo',
    patient_reported: 'Imeripotiwa na mgonjwa',
    ai_organized: 'Muhtasari uliopangwa na AI',
  },
  verificationLabels: {
    verified: 'Imethibitishwa',
    pending: 'Inasubiri uthibitisho',
    disputed: 'Inapingwa',
    superseded: 'Imepitwa na mpya',
    unverified: 'Bado haijathibitishwa',
  },
  patientTabs: {
    today: 'Leo',
    progress: 'Maendeleo',
    passport: 'Pasipoti',
    help: 'Msaada',
    profile: 'Wasifu',
  },
  patientToday: {
    greeting: 'Habari, {{name}}',
    planDay: 'Siku ya {{day}} kati ya {{total}}',
    startCheckIn: 'Anza kujaza taarifa',
    checkInCompleted: 'Taarifa ya leo imekamilika',
    medicationTasksTitle: 'Dawa zako za leo',
    noActivePlan:
      'Hakuna mpango wa huduma unaoendelea. Kliniki yako itakupangia kwenye ziara ijayo.',
  },
  patientProgress: {
    title: 'Maendeleo',
    checkInsCompleted: 'Taarifa zilizokamilika: {{completed}} kati ya {{total}}',
    dosesConfirmed: 'Dozi zilizothibitishwa: {{confirmed}} kati ya {{expected}}',
    discussWithClinician: 'Jadili jambo hili na tabibu wako.',
  },
  passport: {
    title: 'Pasipoti ya Huduma',
    lastUpdated: 'Imesasishwa mwisho {{date}}',
    notCompleteNote: 'Pasipoti hii huenda haijumuishi kila kumbukumbu kutoka kila kituo.',
    share: 'Shiriki Pasipoti ya Huduma',
    activeSharing: 'Ushirikiaji unaoendelea',
    accessHistory: 'Historia ya ufikiaji',
    offlineFreshness: 'Unaangalia nakala iliyohifadhiwa. Huenda haina mabadiliko ya karibuni.',
    sections: {
      important_alerts: 'Muhimu',
      medications: 'Dawa za sasa',
      allergies: 'Aleji',
      conditions: 'Hali za kiafya',
      encounters: 'Matibabu na ziara za karibuni',
      procedures: 'Taratibu za matibabu',
      care_plans: 'Mipango ya huduma na ushauri',
      clinician_advice: 'Ushauri wa tabibu',
      observations: 'Vipimo na matokeo',
      documents: 'Nyaraka',
    },
  },
  help: {
    title: 'Msaada',
    clinicContact: 'Mawasiliano ya kliniki',
    urgentInstructionsTitle: 'Maelekezo ya dharura kutoka kliniki yako',
    privacyTitle: 'Faragha yako',
    privacyBody:
      'Taarifa zako zinatumika kwa ajili ya ufuatiliaji wa huduma yako tu. Wewe ndiye unayechagua cha kushiriki na unaweza kusitisha ushirikiaji wakati wowote.',
  },
  profile: {
    title: 'Wasifu',
    notifications: 'Arifa',
    consent: 'Ridhaa',
    demoControls: 'Vidhibiti vya maonyesho',
    switchRole: 'Badilisha nafasi (kwa majaribio tu)',
  },
  clinicianTabs: {
    home: 'Mwanzo',
    patients: 'Wagonjwa',
    reviews: 'Mapitio',
    templates: 'Violezo',
    profile: 'Wasifu',
  },
  clinicianHome: {
    title: 'Muhtasari',
    activePlans: 'Mipango inayoendelea',
    dueToday: 'Zinatakiwa leo',
    reviewCount: 'Mapitio',
    urgentCount: 'Dharura',
    recentActivity: 'Shughuli za karibuni',
  },
  clinicianPatients: {
    title: 'Wagonjwa',
    searchPlaceholder: 'Tafuta kwa jina au kitambulisho',
    lastCheckIn: 'Taarifa ya mwisho {{date}}',
    noCheckInsYet: 'Hakuna taarifa bado',
    openAlerts: 'Tahadhari {{count}} iliyo wazi',
    openAlerts_other: 'Tahadhari {{count}} zilizo wazi',
  },
  reviews: {
    title: 'Foleni ya mapitio',
    emptyState: 'Hakuna vipengele vya mapitio vilivyo wazi.',
    reasonLabel: 'Sababu',
    evidenceLabel: 'Ushahidi',
    viewTrace: 'Angalia mchakato ulivyofanyika',
  },
  templates: {
    title: 'Violezo vya mipango ya huduma',
    versionLabel: 'Toleo la {{version}}',
    questionsCount: 'Swali {{count}}',
    questionsCount_other: 'Maswali {{count}}',
    rulesCount: 'Kanuni {{count}}',
    rulesCount_other: 'Kanuni {{count}}',
  },
  adherence: {
    fraction: '{{confirmed}} zimethibitishwa / {{expected}} zilizotarajiwa',
    notApplicable: 'Hakuna dozi zilizotarajiwa katika kipindi hiki',
  },
};
