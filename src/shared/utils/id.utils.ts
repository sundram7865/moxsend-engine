import { v4 as uuidv4 } from 'uuid';

export function generateJobId(): string {
  return `job_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
}