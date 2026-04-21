import { JOB_CONSTANTS } from '@/shared/constants/job.constants';
import type { RowValidationError } from '@/shared/types/api.types';

export interface ParsedRow {
  _rowIndex: number;
  name: string;
  company: string;
  industry: string;
  city: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  validRows: ParsedRow[];
  rowErrors: RowValidationError[];
}

export function validateRows(records: Record<string, string>[]): ValidationResult {
  const validRows: ParsedRow[] = [];
  const rowErrors: RowValidationError[] = [];

  records.forEach((record, idx) => {
    const rowIndex = idx + 1;

    // Normalise all keys to lowercase
    const normalised: Record<string, string> = {};
    for (const key of Object.keys(record)) {
      normalised[key.toLowerCase().trim()] = record[key]?.trim() ?? '';
    }

    const emptyFields = JOB_CONSTANTS.REQUIRED_CSV_COLUMNS.filter(
      (col) => !normalised[col] || normalised[col] === '',
    );

    if (emptyFields.length > 0) {
      rowErrors.push({
        rowIndex,
        error: 'MISSING_FIELDS',
        message: `Row ${rowIndex}: empty required fields — ${emptyFields.join(', ')}`,
      });
      return;
    }

    validRows.push({
      _rowIndex: rowIndex,
      name: normalised['name'],
      company: normalised['company'],
      industry: normalised['industry'],
      city: normalised['city'],
    });
  });

  return { validRows, rowErrors };
}

export function validateHeaders(headers: string[]): string[] {
  const normalised = headers.map((h) => h.toLowerCase().trim());
  return JOB_CONSTANTS.REQUIRED_CSV_COLUMNS.filter((col) => !normalised.includes(col));
}