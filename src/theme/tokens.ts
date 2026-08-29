/**
 * POST design tokens — "clinical field notebook, refined for mobile".
 *
 * Starting values from the design contract (docs/DESIGN_SYSTEM.md). Refine
 * only through an explicit design review recorded in docs/DESIGN_QA.md.
 * Status colors are never used alone: pair with text and, when useful, icon.
 */
export const colors = {
  canvas: '#F5F7F5',
  surface: '#FFFFFF',
  ink: '#17231F',
  mutedInk: '#5C6964',
  brand: '#0B6B61',
  brandStrong: '#075249',
  line: '#DCE3DF',
  review: '#9A5B06',
  urgent: '#B42318',
  success: '#247A52',
  focus: '#1769E0',
  onBrand: '#FFFFFF',
  reviewSurface: '#FBF3E7',
  urgentSurface: '#FCEBEA',
  successSurface: '#EAF4EF',
} as const;

/** Four-point spacing grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Restrained type scale on the native system font. Kiswahili copy runs long:
 * every component must tolerate at least 35% text expansion.
 */
export const typography = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

/** Minimum touch target per the design acceptance criteria. */
export const MIN_TOUCH_TARGET = 44;

export type WorkflowStatusColor = 'on_track' | 'review' | 'urgent';

export const statusColors: Record<WorkflowStatusColor, { foreground: string; background: string }> =
  {
    on_track: { foreground: colors.success, background: colors.successSurface },
    review: { foreground: colors.review, background: colors.reviewSurface },
    urgent: { foreground: colors.urgent, background: colors.urgentSurface },
  };
