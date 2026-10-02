import { useState } from "react";
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
      grades: Array(gradeCount).fill(0),
    },
  ]);

  const calculateAverage = (grades: number[]) => {
    if (grades.length === 0) {
      return 0;
    }

    const total = grades.reduce((sum, grade) => sum + grade, 0);

    return total / grades.length;
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

  const updateGrade = (
    studentId: number,
    gradeIndex: number,
    value: number
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
                  value={gradeWeights[index] === 0 ? "" : gradeWeights[index]}
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
        </thead>

        <tbody>
          {students.map((student) => {
            const average = calculateAverage(student.grades);

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
                  />
                </td>

                {student.grades.map((grade, index) => (
                  <td key={index}>
                    <input
                      type="number"
                      value={grade === 0 ? "" : grade}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) =>
                        updateGrade(
                          student.id,
                          index,
                          Number(event.target.value)
                        )
                      }
                    />
                  </td>
                ))}

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