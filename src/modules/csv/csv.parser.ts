import { parse } from 'csv-parse/sync';
import { JOB_CONSTANTS } from '@/shared/constants/job.constants';
import { validateHeaders, validateRows } from './csv.validator';
import type { ValidationResult } from './csv.validator';

export interface CSVParseError {
  error: string;
  message: string;
  missingColumns?: string[];
}

export function parseCSV(buffer: Buffer): ValidationResult {
  let records: Record<string, string>[];

  try {
    records = parse(buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // handle Excel-exported CSVs with BOM
    }) as Record<string, string>[];
  } catch (err) {
    const parseError: CSVParseError = {
      error: 'INVALID_CSV',
      message: `CSV parse error: ${(err as Error).message}`,
    };
    throw parseError;
  }

  if (records.length === 0) {
    const emptyError: CSVParseError = {
      error: 'EMPTY_CSV',
      message: 'The uploaded CSV has no data rows.',
    };
    throw emptyError;
  }

  if (records.length > JOB_CONSTANTS.MAX_ROWS_PER_UPLOAD) {
    const limitError: CSVParseError = {
      error: 'TOO_MANY_ROWS',
      message: `CSV exceeds maximum of ${JOB_CONSTANTS.MAX_ROWS_PER_UPLOAD} rows. Got ${records.length}.`,
    };
    throw limitError;
  }

  // Check headers
  const headers = Object.keys(records[0]);
  const missingColumns = validateHeaders(headers);

  if (missingColumns.length > 0) {
    const headerError: CSVParseError = {
      error: 'INVALID_CSV',
      message: `Missing required columns: ${missingColumns.join(', ')}`,
      missingColumns,
    };
    throw headerError;
  }

  return validateRows(records);
}