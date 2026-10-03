import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import type { Student } from "../../types/Student";
import type { SavedTemplate } from "../../types/Template";
import {
  calculateWeightedAverage,
  getAcademicStatus,
  isGradeValid,
} from "../../utils/gradeCalculations";
import type { Translator } from "../../utils/i18n";
import Icon from "../Icon/Icon";

interface GradeTableProps {
  templateId: string;
  templateName: string;
  gradingScale: string;
  gradeCount: number;
  initialGradeWeights: number[];
  initialStudents: Student[];
  initialShowAttendance?: boolean;
  initialAttendance?: Record<string, boolean>;
  onSaveTemplate: (template: SavedTemplate) => void;
  t: Translator;
  onBackToTemplate: (template: SavedTemplate) => void;
}

function GradeTable({
  templateId,
  templateName,
  gradingScale,
  gradeCount,
  initialGradeWeights,
  initialStudents,
  initialShowAttendance = false,
  initialAttendance = {},
  onSaveTemplate,
  t,
  onBackToTemplate,
}: GradeTableProps) {
  const [gradeWeights, setGradeWeights] = useState<number[]>(
    initialGradeWeights
  );
  const [editableTemplateName, setEditableTemplateName] = useState(templateName);
  const templateNameInputRef = useRef<HTMLInputElement>(null);
  
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const [importError, setImportError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showAttendance, setShowAttendance] = useState(
    initialShowAttendance
  );
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    initialAttendance
  );
  const [studentFilter, setStudentFilter] = useState<
    "all" | "passing" | "at-risk" | "failing" | "pending"
  >( "all");

  const addStudent = () => {
  const nextStudentId = students.reduce(
    (highestId, student) => Math.max(highestId, student.id),
    0
  ) + 1;

  const newStudent: Student = {
    id: nextStudentId,
    name: `Student ${nextStudentId}`,
    grades: Array(gradeCount).fill(0),
  };

  setStudents((currentStudents) => [
    ...currentStudents,
    newStudent,
    ]);
  };

  const removeStudent = (studentId: number, studentName: string) => {
    const shouldRemove = window.confirm(
      t("removeStudentConfirm", { name: studentName })
    );

    if (!shouldRemove) {
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.filter((student) => student.id !== studentId)
    );
  };

  const exportToExcel = () => {
    if (!isWeightTotalValid || hasInvalidWeight) {
      return;
    }

    const data = students.map((student) => {
      const row: Record<string, string | number> = {
        Student: student.name,
      };

      student.grades.forEach((grade, index) => {
        row[`Grade ${index + 1}`] = grade ?? "";
      });

      row.Average = calculateWeightedAverage(
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
      `${editableTemplateName}.xlsx`
    );
  };

  const totalWeight = gradeWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  const hasInvalidWeight = gradeWeights.some(
    (weight) => Number.isNaN(weight) || weight < 0 || weight > 100
  );

  const isWeightTotalValid =
    !hasInvalidWeight && Math.abs(totalWeight - 100) < 0.01;

  const updateWeight = (index: number, value: string) => {
    const newWeights = [...gradeWeights];
    newWeights[index] = value === "" ? 0 : Number(value);
    setGradeWeights(newWeights);
  };

  const importFromExcel = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const shouldImport = window.confirm(
      t("importConfirm")
    );

    if (!shouldImport) {
      event.target.value = "";
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(t("importNoWorksheet"));
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet
      );

      const importedStudents: Student[] = [];

      rows.forEach((row, rowIndex) => {
        const isEmptyRow = Object.values(row).every(
          (value) =>
            value === undefined ||
            value === null ||
            String(value).trim() === ""
        );

        if (isEmptyRow) {
          return;
        }

        const studentName = String(row.Student ?? "").trim();

        if (!studentName) {
          throw new Error(
            t("importMissingName", { row: rowIndex + 2 })
          );
        }

        const grades = Array.from(
          { length: gradeCount },
          (_, gradeIndex) => {
            const rawGrade = row[`Grade ${gradeIndex + 1}`];

            if (
              rawGrade === undefined ||
              rawGrade === null ||
              String(rawGrade).trim() === ""
            ) {
              return null;
            }

            const grade = Number(rawGrade);
            const isInvalidGrade =
              Number.isNaN(grade) ||
              grade < 0 ||
              (gradingScale === "0-5" && grade > 5) ||
              (gradingScale === "0-100" && grade > 100) ||
              (gradingScale === "0-1" && grade > 1);

            if (isInvalidGrade) {
              throw new Error(
                t("importInvalidGrade", { row: rowIndex + 2 })
              );
            }

            return grade;
          }
        );

        importedStudents.push({
          id: importedStudents.length + 1,
          name: studentName,
          grades,
        });
      });

      if (importedStudents.length === 0) {
        throw new Error(t("importNoStudents"));
      }

      setStudents(importedStudents);
      setImportError("");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : t("importError")
      );
    } finally {
      event.target.value = "";
    }
  };

  const getCurrentTemplate = useCallback(
    (): SavedTemplate => ({
      id: templateId,
      name: editableTemplateName,
      gradingScale,
      gradeCount,
      gradeWeights,
      students,
      showAttendance,
      attendance,
    }),
    [
      attendance,
      gradeWeights,
      gradeCount,
      showAttendance,
      students,
      templateId,
      editableTemplateName,
      gradingScale,
    ]
  );

  useEffect(() => {
    onSaveTemplate(getCurrentTemplate());
  }, [
    attendance,
    getCurrentTemplate,
    onSaveTemplate,
  ]);

  const saveTemplateLocally = () => {
    const templateToSave = getCurrentTemplate();
    onSaveTemplate(templateToSave);
    setSaveMessage(t("saved"));
  };

  const getStatusLabel = (status: string) => {
    if (status === "pending") return t("pending");
    if (status === "passing") return t("satisfactory");
    if (status === "at-risk") return t("atRisk");
    return t("insufficient");
  };

  const studentStatuses = students.map((student) => {
    const hasCompleteGrades =
      student.grades.length > 0 &&
      student.grades.every((grade) => grade !== null);

    return {
      student,
      status: hasCompleteGrades
        ? getAcademicStatus(
            calculateWeightedAverage(student.grades, gradeWeights),
            gradingScale
          )
        : "pending",
    };
  });

  const filteredStudents = studentStatuses
    .filter(({ status }) => studentFilter === "all" || status === studentFilter)
    .map(({ student }) => student);

  const statusCounts = {
    passing: studentStatuses.filter(({ status }) => status === "passing").length,
    atRisk: studentStatuses.filter(({ status }) => status === "at-risk").length,
    failing: studentStatuses.filter(({ status }) => status === "failing").length,
    pending: studentStatuses.filter(({ status }) => status === "pending").length,
  };

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
    <section className="grade-table-section panel">
      <div className="grade-sheet-heading">
        <div>
          <div className="template-name-editor">
            <input
              ref={templateNameInputRef}
              className="template-name-input"
              type="text"
              value={editableTemplateName}
              onChange={(event) => setEditableTemplateName(event.target.value)}
              aria-label={t("templateName")}
            />
            <button
              className="template-name-edit"
              type="button"
              onClick={() => templateNameInputRef.current?.focus()}
              aria-label={t("edit")}
              title={t("edit")}
            >
              <Icon name="edit" size={17} />
            </button>
          </div>
          <p>{t("editableGradeSheet")} · {t("lastSaved")}</p>
        </div>

        <div className="grade-sheet-actions">
          <button className="button button-secondary" type="button" onClick={() => onBackToTemplate(getCurrentTemplate())}>
            <Icon name="arrow-left" size={16} />
            {t("back")}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setShowAttendance(!showAttendance)}>
            {showAttendance ? t("attendance") : t("addAttendance")}
          </button>
          <button className="button button-secondary" type="button" onClick={exportToExcel} disabled={!isWeightTotalValid || hasInvalidWeight}>
            <Icon name="download" size={16} />
            {t("export")}
          </button>
          <button className="button button-primary" type="button" onClick={saveTemplateLocally}>
            <Icon name="save" size={16} />
            {t("saveChanges")}
          </button>
        </div>
      </div>

      <div className="grade-sheet-toolbar">
        <div className="student-filters" role="tablist" aria-label={t("student")}>
          <button className={studentFilter === "all" ? "active" : ""} type="button" onClick={() => setStudentFilter("all")}>
            {t("allStudents")}
          </button>
          <button className={studentFilter === "passing" ? "active" : ""} type="button" onClick={() => setStudentFilter("passing")}>
            {t("satisfactory")} <span>{statusCounts.passing}</span>
          </button>
          <button className={studentFilter === "at-risk" ? "active" : ""} type="button" onClick={() => setStudentFilter("at-risk")}>
            {t("atRisk")} <span>{statusCounts.atRisk}</span>
          </button>
          <button className={studentFilter === "failing" ? "active" : ""} type="button" onClick={() => setStudentFilter("failing")}>
            {t("insufficient")} <span>{statusCounts.failing}</span>
          </button>
          <button className={studentFilter === "pending" ? "active" : ""} type="button" onClick={() => setStudentFilter("pending")}>
            {t("pending")} <span>{statusCounts.pending}</span>
          </button>
        </div>

        <div className="import-control">
          <label htmlFor="excelImport"><Icon name="upload" size={16} /> {t("import")}</label>
          <input id="excelImport" type="file" accept=".xlsx,.xls" onChange={importFromExcel} />
        </div>
      </div>

      {saveMessage && <p className="success-message">{saveMessage}</p>}

      {importError && (
        <p className="error-message">
          {importError}
        </p>
      )}

      <div className="table-wrapper">
      <table className="grade-table">
      <thead>
        <tr>
          <th>{t("student")}</th>

          {Array.from({ length: gradeCount }, (_, index) => (
            <th key={index}>
              <div>
                <div>{t("grade", { number: index + 1 })}</div>

                <input
                  type="number"
                  className="weight-input"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    gradeWeights[index] === 0
                      ? ""
                      : gradeWeights[index]
                  }
                  onFocus={(event) => event.target.select()}
                  onChange={(event) =>
                    updateWeight(index, event.target.value)
                  }
                  style={{
                    border: gradeWeights[index] < 0 ||
                      gradeWeights[index] > 100
                      ? "2px solid red"
                      : "1px solid black",
                  }}
                />

                <span>%</span>
              </div>
            </th>
          ))}

          <th>{t("average")}</th>
          <th>{t("status")}</th>
          {showAttendance && <th>{t("attendance")}</th>}
        </tr>

        <tr>
        <th
          colSpan={gradeCount + 3 + (showAttendance ? 1 : 0)}
          style={{
            color: isWeightTotalValid ? "green" : "red",
          }}
        >
          {t("totalWeight", { weight: totalWeight })}
        </th>

        </tr>

        {!isWeightTotalValid && (
          <tr>
            <th colSpan={gradeCount + 3 + (showAttendance ? 1 : 0)} style={{ color: "red" }}>
              {t("weightError")}
            </th>
          </tr>
        )}
      </thead>

        <tbody>
          {filteredStudents.map((student) => {

            const average = calculateWeightedAverage(
              student.grades,
              gradeWeights
            );

            const hasCompleteGrades =
              student.grades.length > 0 &&
              student.grades.every((grade) => grade !== null);
            const status = hasCompleteGrades
              ? getAcademicStatus(average, gradingScale)
              : "pending";

            return (
              <tr key={student.id}>
                <td>

                  <input
                    className="student-name-input"
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

                  <button
                    className="student-delete-button"
                    type="button"
                    aria-label={`${t("delete")} ${student.name}`}
                    title={t("delete")}
                    onClick={() =>
                      removeStudent(student.id, student.name)
                    }
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </td>

                {student.grades.map((grade, index) => {
                  const isInvalidGrade = !isGradeValid(
                    grade,
                    gradingScale
                  );
                  return (
                    <td key={index}>
                    <input
                      className={`grade-input ${isInvalidGrade ? "invalid" : ""}`}
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
                    />

                      {isInvalidGrade && (
                        <small>
                          {t("invalidGrade")}
                        </small>
                      )}
                    </td>
                  );
                })}

                <td className="average-cell">{average.toFixed(2)}</td>
                <td>
                  <span className={`status-pill status-${status}`}>
                    {getStatusLabel(status)}
                  </span>
                </td>
                {showAttendance && (
                  <td>
                    <label className="attendance-control">
                      <input
                        type="checkbox"
                        checked={attendance[String(student.id)] ?? false}
                        onChange={(event) =>
                          setAttendance((currentAttendance) => ({
                            ...currentAttendance,
                            [student.id]: event.target.checked,
                          }))
                        }
                      />
                      <span>{t("present")}</span>
                    </label>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <div className="grade-sheet-footer">
        <span>
          {t("showingStudents", {
            shown: filteredStudents.length,
            total: students.length,
          })}
        </span>
        <button className="button button-secondary" type="button" onClick={addStudent}>
          <Icon name="plus" size={16} />
          {t("addStudent")}
        </button>
      </div>
    </section>
  );
}

export default GradeTable;
