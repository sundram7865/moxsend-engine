import type { RowValidationError, UploadJobResponse } from '@/shared/types/api.types';

export interface OutreachUploadResult {
  response: UploadJobResponse;
  skippedRows: number;
  rowErrors: RowValidationError[];
}