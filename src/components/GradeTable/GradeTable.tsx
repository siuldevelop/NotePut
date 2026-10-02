import { useState } from "react";
import * as XLSX from "xlsx";
import type { Student } from "../../types/Student";

interface GradeTableProps {
  templateName: string;
  gradingScale: string;
  gradeCount: number;
}

function GradeTable({
  templateName,
  gradingScale,
  gradeCount,
}: GradeTableProps) {
  const [gradeWeights, setGradeWeights] = useState<number[]>(
    Array(gradeCount).fill(100 / gradeCount)
  );
  
  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: "Juan Pérez",
      grades: Array(gradeCount).fill(null),
    },
  ]);

  const calculateAverage = (
    grades: (number | null)[],
    weights: number[]
  ) => {
    let total = 0;

    grades.forEach((grade, index) => {
      if (grade !== null) {
        total += grade * (weights[index] / 100);
      }
    });

    return total;
  };

  const getStudentStatus = (average: number) => {
    if (gradingScale === "0-5") {
      if (average >= 3.5) return "passing";
      if (average >= 3.0) return "at-risk";
      return "failing";
    }

    if (gradingScale === "0-100") {
      if (average >= 70) return "passing";
      if (average >= 60) return "at-risk";
      return "failing";
    }

    if (gradingScale === "0-1") {
      if (average >= 0.7) return "passing";
      if (average >= 0.6) return "at-risk";
      return "failing";
    }

    return "failing";
  };

  const addStudent = () => {
  const newStudent: Student = {
    id: students.length + 1,
    name: `Student ${students.length + 1}`,
    grades: Array(gradeCount).fill(0),
  };

  setStudents((currentStudents) => [
    ...currentStudents,
    newStudent,
    ]);
  };

  const exportToExcel = () => {
    const data = students.map((student) => {
      const row: Record<string, string | number> = {
        Student: student.name,
      };

      student.grades.forEach((grade, index) => {
        row[`Grade ${index + 1}`] = grade ?? "";
      });

      row.Average = calculateAverage(
        student.grades,
        gradeWeights
      );

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Grades"
    );

    XLSX.writeFile(
      workbook,
      `${templateName}.xlsx`
    );
  };

  const totalWeight = gradeWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  const updateGrade = (
    studentId: number,
    gradeIndex: number,
    value: number | null
  ) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) => {
        if (student.id !== studentId) {
          return student;
        }

        const updatedGrades = [...student.grades];

        updatedGrades[gradeIndex] = value;

        return {
          ...student,
          grades: updatedGrades,
        };
      })
    );
  };

  return (
    <section>
      <h2>{templateName}</h2>

      <div>
        <span>🟢 Passing</span>{" "}
        <span>🟡 At risk</span>{" "}
        <span>🔴 Failing</span>
      </div>

      <button type="button" onClick={exportToExcel}>
        Export to Excel
      </button>

      <button type="button" onClick={addStudent}>
        + Add student
      </button>

      <table>
      <thead>
        <tr>
          <th>Student</th>

          {Array.from({ length: gradeCount }, (_, index) => (
            <th key={index}>
              <div>
                <div>Grade {index + 1}</div>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    gradeWeights[index] === 0
                      ? ""
                      : gradeWeights[index]
                  }
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    const newWeights = [...gradeWeights];

                    newWeights[index] = Number(event.target.value);

                    setGradeWeights(newWeights);
                  }}
                />

                <span>%</span>
              </div>
            </th>
          ))}

          <th>Average</th>
        </tr>

        <tr>
        <th
          colSpan={gradeCount + 2}
          style={{
            color: totalWeight === 100 ? "green" : "red",
          }}
        >
          Total weight: {totalWeight}%
        </th>

        </tr>
      </thead>

        <tbody>
          {students.map((student) => {

            const average = calculateAverage(
              student.grades,
              gradeWeights
            );

            const status = getStudentStatus(average);

            return (
              <tr key={student.id}>
                <td>

                  <input
                    type="text"
                    value={student.name}
                    onChange={(event) => {
                      setStudents((currentStudents) =>
                        currentStudents.map((currentStudent) =>
                          currentStudent.id === student.id
                            ? {
                                ...currentStudent,
                                name: event.target.value,
                              }
                            : currentStudent
                        )
                      );
                    }}
                    style={{
                      backgroundColor:
                        status === "passing"
                          ? "#d4edda"
                          : status === "at-risk"
                          ? "#fff3cd"
                          : "#f8d7da",
                    }}
                  />
                </td>

                {student.grades.map((grade, index) => {
                  const isInvalidGrade =
                    grade !== null &&
                    (
                      grade < 0 ||
                      (gradingScale === "0-5" && grade > 5) ||
                      (gradingScale === "0-100" && grade > 100) ||
                      (gradingScale === "0-1" && grade > 1)
                    );
                  return (
                    <td key={index}>
                    <input
                      type="number"
                      value={grade ?? ""}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => {
                        const value = event.target.value;

                        updateGrade(
                          student.id,
                          index,
                          value === "" ? null : Number(value)
                        );
                      }}
                      style={{
                        border: isInvalidGrade
                          ? "3px solid #8f4a4a"
                          : "1px solid black",

                        borderRadius: "12px",

                        boxShadow: isInvalidGrade
                          ? "0 0 3px #8f4a4a"
                          : "none",
                      }}
                    />

                      {isInvalidGrade && (
                        <small style={{ color: "#8f4a4a" }}>
                          Invalid grade
                        </small>
                      )}
                    </td>
                  );
                })}

                <td>{average.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default GradeTable;