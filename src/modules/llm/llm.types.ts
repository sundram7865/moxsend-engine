export interface LLMInput {
  rowIndex: number;
  name: string;
  company: string;
  industry: string;
  city: string;
}

export interface LLMOutput {
  openingLine: string;
  email: string;
  subjectLines: [string, string];
}