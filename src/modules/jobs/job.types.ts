import type { Job, Result, RowError, JobStatus } from '@prisma/client';

export type { JobStatus };

export type JobWithRelations = Job & {
  results: Result[];
  rowErrors: RowError[];
};

export interface CreateJobInput {
  id: string;
  totalRows: number;
}

export interface AppendResultInput {
  jobId: string;
  rowIndex: number;
  name: string;
  company: string;
  industry: string;
  city: string;
  openingLine: string;
  email: string;
  subjectLine1: string;
  subjectLine2: string;
}

export interface AppendErrorInput {
  jobId: string;
  rowIndex: number;
  name?: string;
  error: string;
  message: string;
}