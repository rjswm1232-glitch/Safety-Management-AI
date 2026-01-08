
export interface SafetyTableRow {
  id: string;
  unitTask: string;
  potentialHazard: string;
  safetyMeasure: string;
  reflectedItems: string;
}

export interface SupplementRow {
  unitTask: string;
  potentialHazard: string;
  safetyMeasure: string;
}

export interface FullAnalysisResult {
  tableData: Omit<SafetyTableRow, 'reflectedItems' | 'id'>[];
  legalClauses: string;
}

export interface SavedProcess {
  id: string;
  title: string;
  summary: string;
  rows: SafetyTableRow[];
  createdAt: string;
}
