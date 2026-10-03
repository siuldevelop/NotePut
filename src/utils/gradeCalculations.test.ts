import { describe, expect, it } from "vitest";
import {
  calculateSimpleAverage,
  calculateWeightedAverage,
  getAcademicStatus,
  isGradeValid,
} from "./gradeCalculations";

describe("calculateSimpleAverage", () => {
  it("calculates the average of entered grades", () => {
    expect(calculateSimpleAverage([4, 3, 5])).toBe(4);
  });

  it("ignores empty grades", () => {
    expect(calculateSimpleAverage([4, null, 2])).toBe(3);
  });

  it("returns zero when no grades are entered", () => {
    expect(calculateSimpleAverage([null, null])).toBe(0);
  });
});

describe("calculateWeightedAverage", () => {
  it("calculates a complete weighted average", () => {
    expect(
      calculateWeightedAverage([4, 3], [50, 50])
    ).toBe(3.5);
  });

  it("ignores empty grades when calculating the average", () => {
    expect(
      calculateWeightedAverage([4, null], [50, 50])
    ).toBe(4);
  });

  it("returns zero when all grades are empty", () => {
    expect(
      calculateWeightedAverage([null, null], [50, 50])
    ).toBe(0);
  });
});

describe("isGradeValid", () => {
  it("validates the 0-5 grading scale", () => {
    expect(isGradeValid(5, "0-5")).toBe(true);
    expect(isGradeValid(5.1, "0-5")).toBe(false);
  });

  it("validates the 0-100 grading scale", () => {
    expect(isGradeValid(100, "0-100")).toBe(true);
    expect(isGradeValid(100.1, "0-100")).toBe(false);
  });

  it("validates the 0-1 grading scale", () => {
    expect(isGradeValid(1, "0-1")).toBe(true);
    expect(isGradeValid(1.1, "0-1")).toBe(false);
  });

  it("allows empty grades and rejects negative grades", () => {
    expect(isGradeValid(null, "0-5")).toBe(true);
    expect(isGradeValid(-1, "0-5")).toBe(false);
  });
});

describe("getAcademicStatus", () => {
  it("returns the correct status for the 0-5 scale", () => {
    expect(getAcademicStatus(3.5, "0-5")).toBe("passing");
    expect(getAcademicStatus(3, "0-5")).toBe("at-risk");
    expect(getAcademicStatus(2.9, "0-5")).toBe("failing");
  });

  it("returns the correct status for the 0-100 scale", () => {
    expect(getAcademicStatus(70, "0-100")).toBe("passing");
    expect(getAcademicStatus(60, "0-100")).toBe("at-risk");
    expect(getAcademicStatus(59, "0-100")).toBe("failing");
  });

  it("returns the correct status for the 0-1 scale", () => {
    expect(getAcademicStatus(0.7, "0-1")).toBe("passing");
    expect(getAcademicStatus(0.6, "0-1")).toBe("at-risk");
    expect(getAcademicStatus(0.5, "0-1")).toBe("failing");
  });
});
