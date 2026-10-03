export type AcademicStatus = "passing" | "at-risk" | "failing";

export const calculateWeightedAverage = (
  grades: (number | null)[],
  weights: number[]
) => {
  let total = 0;
  let completedWeight = 0;

  grades.forEach((grade, index) => {
    if (grade !== null) {
      const weight = weights[index] ?? 0;
      total += grade * (weight / 100);
      completedWeight += weight;
    }
  });

  if (completedWeight === 0) {
    return 0;
  }

  return total / (completedWeight / 100);
};

export const calculateSimpleAverage = (grades: (number | null)[]) => {
  const completedGrades = grades.filter(
    (grade): grade is number => grade !== null
  );

  if (completedGrades.length === 0) {
    return 0;
  }

  const total = completedGrades.reduce(
    (sum, grade) => sum + grade,
    0
  );

  return total / completedGrades.length;
};

export const isGradeValid = (
  grade: number | null,
  gradingScale: string
) => {
  if (grade === null) {
    return true;
  }

  if (!Number.isFinite(grade) || grade < 0) {
    return false;
  }

  if (gradingScale === "0-5") {
    return grade <= 5;
  }

  if (gradingScale === "0-100") {
    return grade <= 100;
  }

  if (gradingScale === "0-1") {
    return grade <= 1;
  }

  return false;
};

export const getAcademicStatus = (
  average: number,
  gradingScale: string
): AcademicStatus => {
  if (gradingScale === "0-5") {
    if (average >= 3.5) return "passing";
    if (average >= 3.0) return "at-risk";
    return "failing";
  }

  if (gradingScale === "0-100") {
    if (average >= 70) return "passing";
    if (average >= 50) return "at-risk";
    return "failing";
  }

  if (gradingScale === "0-1") {
    if (average >= 0.7) return "passing";
    if (average >= 0.5) return "at-risk";
    return "failing";
  }

  return "failing";
};
