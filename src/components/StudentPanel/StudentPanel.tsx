import { useEffect, useMemo, useState } from "react";
import {
  calculateSimpleAverage,
  getAcademicStatus,
  isGradeValid,
} from "../../utils/gradeCalculations";
import type { Translator } from "../../utils/i18n";
import type { SavedTemplate } from "../../types/Template";

interface PersonalStudent {
  id: number;
  name: string;
  className: string;
  gradingScale: string;
  grades: (number | null)[];
  notes: string;
  isTeacherStudent?: boolean;
  templateId?: string;
  sourceStudentId?: number;
}

interface StudentPanelProps {
  t: Translator;
  templates: SavedTemplate[];
  onDeleteTeacherStudent: (
    templateId: string,
    studentId: number,
    studentName: string
  ) => void;
}

const PERSONAL_STUDENTS_KEY = "noteput-personal-students";

const createStudent = (id: number): PersonalStudent => ({
  id,
  name: "",
  className: "",
  gradingScale: "0-5",
  grades: Array(3).fill(null),
  notes: "",
});

const readPersonalStudents = (): PersonalStudent[] => {
  try {
    const savedStudents = localStorage.getItem(PERSONAL_STUDENTS_KEY);
    if (!savedStudents) return [];

    const parsedStudents: unknown = JSON.parse(savedStudents);
    if (!Array.isArray(parsedStudents)) return [];

    return parsedStudents.filter(
      (student): student is PersonalStudent =>
        Boolean(student) &&
        typeof student === "object" &&
        typeof (student as PersonalStudent).id === "number" &&
        typeof (student as PersonalStudent).name === "string" &&
        typeof (student as PersonalStudent).className === "string" &&
        Array.isArray((student as PersonalStudent).grades)
    );
  } catch {
    return [];
  }
};

function StudentPanel({ t, templates, onDeleteTeacherStudent }: StudentPanelProps) {
  const [students, setStudents] = useState<PersonalStudent[]>(
    readPersonalStudents
  );
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    () => readPersonalStudents()[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const teacherStudents = useMemo(
    () =>
      templates.flatMap((template, templateIndex) =>
        template.students.map((student) => ({
          id: -((templateIndex + 1) * 100000 + student.id),
          name: student.name,
          className: template.name,
          gradingScale: template.gradingScale,
          grades: student.grades,
          notes: "",
          isTeacherStudent: true,
          templateId: template.id,
          sourceStudentId: student.id,
        }))
      ),
    [templates]
  );

  const directoryStudents = useMemo(
    () => [...teacherStudents, ...students],
    [students, teacherStudents]
  );

  useEffect(() => {
    localStorage.setItem(PERSONAL_STUDENTS_KEY, JSON.stringify(students));
  }, [students]);

  const selectedStudent =
    directoryStudents.find((student) => student.id === selectedStudentId) ??
    directoryStudents[0];

  const getAverage = (student: PersonalStudent) =>
    calculateSimpleAverage(
      student.grades.filter(
        (grade): grade is number =>
          grade !== null && isGradeValid(grade, student.gradingScale)
      )
    );

  const getStatus = (student: PersonalStudent) =>
    getAcademicStatus(getAverage(student), student.gradingScale);

  const getStatusLabel = (student: PersonalStudent) => {
    const status = getStatus(student);
    return status === "passing"
      ? t("passing")
      : status === "at-risk"
      ? t("atRisk")
      : t("failing");
  };

  const filteredStudents = useMemo(
    () =>
      directoryStudents.filter((student) =>
        `${student.name} ${student.className}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [directoryStudents, search]
  );

  const averagePerformance = directoryStudents.length
    ? directoryStudents.reduce((total, student) => total + getAverage(student), 0) /
      directoryStudents.length
    : 0;
  const studentsNeedingAttention = directoryStudents.filter(
    (student) => getStatus(student) !== "passing"
  ).length;
  const classCount = new Set(
    directoryStudents.map((student) => student.className).filter(Boolean)
  ).size;

  const addStudent = () => {
    const nextId = students.reduce(
      (highestId, student) => Math.max(highestId, student.id),
      0
    ) + 1;
    const newStudent = createStudent(nextId);

    setStudents((currentStudents) => [...currentStudents, newStudent]);
    setSelectedStudentId(nextId);
    setSaveMessage("");
  };

  const updateSelectedStudent = (changes: Partial<PersonalStudent>) => {
    if (selectedStudentId === null || selectedStudent?.isTeacherStudent) return;

    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === selectedStudentId ? { ...student, ...changes } : student
      )
    );
    setSaveMessage("");
  };

  const updateGrade = (index: number, value: string) => {
    if (!selectedStudent) return;

    const grades = [...selectedStudent.grades];
    grades[index] = value === "" ? null : Number(value);
    updateSelectedStudent({ grades });
  };

  const updateGradeCount = (value: string) => {
    if (!selectedStudent) return;

    const gradeCount = Number(value);
    updateSelectedStudent({
      grades: Array.from(
        { length: gradeCount },
        (_, index) => selectedStudent.grades[index] ?? null
      ),
    });
  };

  const saveSelectedStudent = () => {
    localStorage.setItem(PERSONAL_STUDENTS_KEY, JSON.stringify(students));
    setSaveMessage(t("saved"));
  };

  const deleteSelectedStudent = () => {
    if (!selectedStudent) return;

    if (selectedStudent.isTeacherStudent) {
      if (selectedStudent.templateId && selectedStudent.sourceStudentId) {
        onDeleteTeacherStudent(
          selectedStudent.templateId,
          selectedStudent.sourceStudentId,
          selectedStudent.name
        );
      }
      return;
    }

    const shouldDelete = window.confirm(
      t("removeStudentConfirm", {
        name: selectedStudent.name || t("student"),
      })
    );

    if (!shouldDelete) return;

    setStudents((currentStudents) =>
      currentStudents.filter((student) => student.id !== selectedStudent.id)
    );
    setSelectedStudentId(null);
    setSaveMessage("");
  };

  const copySummary = async () => {
    if (!selectedStudent) return;

    const summary = [
      `${t("studentName")}: ${selectedStudent.name || t("student")}`,
      `${t("className")}: ${selectedStudent.className || t("none")}`,
      `${t("grades")}: ${selectedStudent.grades
        .map((grade) => grade ?? t("empty"))
        .join(", ")}`,
      `${t("average")}: ${getAverage(selectedStudent).toFixed(2)}`,
      `${t("academicStatus")}: ${getStatusLabel(selectedStudent)}`,
      `${t("notes")}: ${selectedStudent.notes || t("none")}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setSaveMessage(t("copied"));
    } catch {
      setSaveMessage(t("copyError"));
    }
  };

  const gradeMaximum = selectedStudent?.gradingScale === "0-100"
    ? 100
    : selectedStudent?.gradingScale === "0-1"
    ? 1
    : 5;

  return (
    <section className="student-directory-panel">
      <div className="student-directory-heading">
        <div>
          <p className="student-directory-eyebrow">{t("studentDirectory")}</p>
          <h1>{t("yourStudents")}</h1>
          <p>{t("studentDirectorySubtitle")}</p>
        </div>
        <button className="button button-primary" type="button" onClick={addStudent}>
          + {t("addPersonalStudent")}
        </button>
      </div>

      <div className="student-directory-stats">
        <article><small>{t("totalStudents")}</small><strong>{students.length}</strong><span>{t("acrossClasses", { count: classCount })}</span></article>
        <article><small>{t("averagePerformance")}</small><strong>{averagePerformance.toFixed(1)}</strong><span>{t("outOfScale", { scale: selectedStudent?.gradingScale === "0-100" ? "100" : selectedStudent?.gradingScale === "0-1" ? "1" : "5.0" })}</span></article>
        <article className="student-stat-warning"><small>{t("needsAttention")}</small><strong>{studentsNeedingAttention}</strong><span>{t("reviewRecommended")}</span></article>
      </div>

      <div className="student-directory-layout">
        <aside className="personal-student-list">
          <div className="personal-student-list-heading">
            <div><h2>{t("allStudents")}</h2><p>{t("reviewIndividualProgress")}</p></div>
            <label className="student-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchStudents")} /></label>
          </div>
          {filteredStudents.map((student) => {
            const status = getStatus(student);
            return (
              <button className={`personal-student-row ${student.id === selectedStudent?.id ? "selected" : ""}`} type="button" key={student.id} onClick={() => setSelectedStudentId(student.id)}>
                <span className="personal-student-avatar">{student.name.slice(0, 2).toUpperCase() || "ST"}</span>
                <span className="personal-student-info"><strong>{student.name || t("student")}</strong><small>{student.className || t("className")}</small></span>
                <span className="personal-student-average"><strong>{getAverage(student).toFixed(1)}</strong><small>{t("average")}</small></span>
                <span className={`status-pill status-${status}`}>{getStatusLabel(student)}</span>
              </button>
            );
          })}
          {filteredStudents.length === 0 && <p className="student-list-empty">{t("noPersonalStudents")}</p>}
        </aside>

        <article className="personal-student-editor">
          {selectedStudent ? (
            <>
              <div className="personal-student-editor-heading">
                <div><p className="student-directory-eyebrow">{t("gradeCalculator")}</p><h2>{selectedStudent.name || t("student")}</h2><p>{selectedStudent.className || t("className")}</p></div>
                <span className="personal-student-avatar large">{selectedStudent.name.slice(0, 2).toUpperCase() || "ST"}</span>
              </div>
              <div className="personal-student-fields">
                <label>{t("studentName")}<input disabled={selectedStudent.isTeacherStudent} value={selectedStudent.name} onChange={(event) => updateSelectedStudent({ name: event.target.value })} placeholder={t("student")} /></label>
                <label>{t("className")}<input disabled={selectedStudent.isTeacherStudent} value={selectedStudent.className} onChange={(event) => updateSelectedStudent({ className: event.target.value })} placeholder={t("classPlaceholder")} /></label>
                <label>{t("gradingScale")}<select disabled={selectedStudent.isTeacherStudent} value={selectedStudent.gradingScale} onChange={(event) => updateSelectedStudent({ gradingScale: event.target.value })}><option value="0-5">0.0 - 5.0</option><option value="0-100">0 - 100</option><option value="0-1">0 - 1</option></select></label>
                <label>{t("numberOfGrades")}<select disabled={selectedStudent.isTeacherStudent} value={selectedStudent.grades.length} onChange={(event) => updateGradeCount(event.target.value)}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
              </div>
              <div className="personal-grade-grid">
                {selectedStudent.grades.map((grade, index) => {
                  const invalid = !isGradeValid(grade, selectedStudent.gradingScale);
                  return <label key={index}>{t("grade", { number: index + 1 })}<input disabled={selectedStudent.isTeacherStudent} type="number" min="0" max={gradeMaximum} step="0.01" value={grade ?? ""} onChange={(event) => updateGrade(index, event.target.value)} aria-invalid={invalid} /></label>;
                })}
              </div>
              <div className="personal-average-box"><small>{t("calculatedAverage")}</small><strong>{getAverage(selectedStudent).toFixed(1)}</strong><span>{t("outOfScale", { scale: gradeMaximum })}</span></div>
              <div className="personal-status-row"><span>{t("status")}</span><span className={`status-pill status-${getStatus(selectedStudent)}`}>{getStatusLabel(selectedStudent)}</span></div>
              <label className="personal-notes">{t("notes")}<textarea disabled={selectedStudent.isTeacherStudent} rows={3} value={selectedStudent.notes} onChange={(event) => updateSelectedStudent({ notes: event.target.value })} placeholder={t("notesPlaceholder")} /></label>
              <div className="personal-student-actions"><button className="button button-primary" type="button" disabled={selectedStudent.isTeacherStudent} onClick={saveSelectedStudent}>{t("saveStudentGrades")}</button><button className="button button-secondary" type="button" onClick={copySummary}>{t("copySummary")}</button><button className="button button-danger" type="button" onClick={deleteSelectedStudent}>{t("deleteStudent")}</button></div>
              {saveMessage && <p className="success-message">{saveMessage}</p>}
            </>
          ) : (
            <div className="student-editor-empty"><h2>{t("noPersonalStudents")}</h2><p>{t("createPersonalStudent")}</p><button className="button button-primary" type="button" onClick={addStudent}>{t("addPersonalStudent")}</button></div>
          )}
        </article>
      </div>
    </section>
  );
}

export default StudentPanel;
