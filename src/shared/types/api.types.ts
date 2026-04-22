import type { JobStatus } from '@prisma/client';

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadJobResponse {
  jobId: string;
  status: JobStatus;
  totalRows: number;
  skippedRows: number;
  rowErrors?: RowValidationError[];
  createdAt: string;
  estimatedSecs: number;
  pollUrl: string;
  resultsUrl: string;
}

export interface RowValidationError {
  rowIndex: number;
  error: string;
  message: string;
}

// ── Status ────────────────────────────────────────────────────────────────────

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progressPct: number;
  totalRows: number;
  processed: number;
  failed: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ── Results ───────────────────────────────────────────────────────────────────

export interface ResultRow {
  id: string;
  rowIndex: number;
  name: string;
  company: string;
  industry: string;
  city: string;
  openingLine: string;
  email: string;
  subjectLines: [string, string];
  processedAt: string;
}

export interface RowErrorResponse {
  rowIndex: number;
  name: string | null;
  error: string;
  message: string;
  failedAt: string;
}

export interface JobResultsResponse {
  jobId: string;
  status: JobStatus;
  totalRows: number;
  processed: number;
  failed: number;
  results: ResultRow[];
  errors?: RowErrorResponse[];
  createdAt: string;
  completedAt: string | null;
}

// ── Jobs list ─────────────────────────────────────────────────────────────────

export interface JobSummary {
  jobId: string;
  status: JobStatus;
  totalRows: number;
  processed: number;
  failed: number;
  createdAt: string;
  completedAt: string | null;
}