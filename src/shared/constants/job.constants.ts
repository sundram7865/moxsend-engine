export const JOB_CONSTANTS = {
  MAX_ROWS_PER_UPLOAD: 1000,
  REQUIRED_CSV_COLUMNS: ['name', 'company', 'industry', 'city'] as const,
} as const;

export type RequiredColumn = (typeof JOB_CONSTANTS.REQUIRED_CSV_COLUMNS)[number];