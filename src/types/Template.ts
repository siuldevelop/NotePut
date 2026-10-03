import type { Student } from "./Student";

export interface TemplateMetadata {
  name: string;
  gradingScale: string;
  gradeCount: number;
}

export interface SavedTemplate extends TemplateMetadata {
  id: string;
  gradeWeights: number[];
  students: Student[];
  showAttendance?: boolean;
  attendance?: Record<string, boolean>;
}
