
export interface ReportRow {
  [key: string]: string | number;
  bottler: string;
  subbottler: string;
}

export interface SubBottlerGroup {
  name: string;
  rows: ReportRow[];
}

export interface EmailDraft {
  subject: string;
  body: string; // This will be HTML content
}

export type EmailMappings = Record<string, string>;
