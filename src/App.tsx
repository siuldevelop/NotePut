import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import TemplateForm from "./components/TemplateForm/TemplateForm";
import GradeTable from "./components/GradeTable/GradeTable";
import StudentPanel from "./components/StudentPanel/StudentPanel";
import ProfessorPanel from "./components/ProfessorPanel/ProfessorPanel";
import Icon from "./components/Icon/Icon";
import notePutIcon from "./assets/icons/icon-svg.svg";
import type { SavedTemplate, TemplateMetadata } from "./types/Template";
import type { Student } from "./types/Student";
import {
  createTranslator,
  type Language,
} from "./utils/i18n";
import {
  calculateWeightedAverage,
  getAcademicStatus,
} from "./utils/gradeCalculations";

const SAVED_TEMPLATES_KEY = "noteput-saved-templates";
const LEGACY_SAVED_TEMPLATE_KEY = "noteput-saved-template";
const LANGUAGE_KEY = "noteput-language";
const THEME_KEY = "noteput-theme";
const DISMISSED_NOTIFICATIONS_KEY = "noteput-dismissed-notifications";

const createTemplateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createExampleTemplate = (): SavedTemplate => ({
  id: "example-template-01",
  name: "Template 01",
  gradingScale: "0-5",
  gradeCount: 3,
  gradeWeights: [33.33, 33.33, 33.34],
  students: [
    { id: 1, name: "Sofia Ramirez", grades: [4.8, 4.5, 4.9] },
    { id: 2, name: "Mateo Torres", grades: [3.2, 3.7, 3.4] },
    { id: 3, name: "Valentina Cruz", grades: [4.6, 4.8, 4.7] },
    { id: 4, name: "Samuel Ortega", grades: [2.8, 3.1, 2.9] },
  ],
});

const isSavedTemplate = (value: unknown): value is SavedTemplate => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const template = value as Partial<SavedTemplate>;

  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    typeof template.gradingScale === "string" &&
    typeof template.gradeCount === "number" &&
    Array.isArray(template.gradeWeights) &&
    Array.isArray(template.students)
  );
};

const getSavedTemplates = (): SavedTemplate[] => {
  try {
    const savedTemplates = localStorage.getItem(SAVED_TEMPLATES_KEY);

    if (savedTemplates !== null) {
      const parsedTemplates: unknown = JSON.parse(savedTemplates);

      if (Array.isArray(parsedTemplates)) {
        return parsedTemplates.filter(isSavedTemplate);
      }
    }

    const legacyTemplate = localStorage.getItem(
      LEGACY_SAVED_TEMPLATE_KEY
    );

    if (legacyTemplate) {
      const parsedLegacyTemplate = JSON.parse(legacyTemplate) as Omit<
        SavedTemplate,
        "id"
      >;

      if (
        typeof parsedLegacyTemplate.name === "string" &&
        typeof parsedLegacyTemplate.gradingScale === "string" &&
        typeof parsedLegacyTemplate.gradeCount === "number" &&
        Array.isArray(parsedLegacyTemplate.gradeWeights) &&
        Array.isArray(parsedLegacyTemplate.students)
      ) {
        return [
          {
            ...parsedLegacyTemplate,
            id: createTemplateId(),
          },
        ];
      }
    }
  } catch {
    return [createExampleTemplate()];
  }

  return [createExampleTemplate()];
};

function App() {
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(
    getSavedTemplates
  );
  const [activeTemplate, setActiveTemplate] =
    useState<SavedTemplate | null>(null);
  const [currentView, setCurrentView] = useState<
    "overview" | "professor-panel" | "student-panel" | "settings"
  >(
    "overview"
  );
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showTemplateSourceChoice, setShowTemplateSourceChoice] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return localStorage.getItem(LANGUAGE_KEY) === "es" ? "es" : "en";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [studentSearchRequest, setStudentSearchRequest] = useState(0);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === "string")
          : [];
      } catch {
        return [];
      }
    }
  );
  const t = createTranslator(language);

  useEffect(() => {
    localStorage.setItem(
      SAVED_TEMPLATES_KEY,
      JSON.stringify(savedTemplates)
    );
  }, [savedTemplates]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(
      DISMISSED_NOTIFICATIONS_KEY,
      JSON.stringify(dismissedNotifications)
    );
  }, [dismissedNotifications]);

  const createTemplate = (template: TemplateMetadata) => {
    const newStudent: Student = {
      id: 1,
      name: "Juan Pérez",
      grades: Array(template.gradeCount).fill(null),
    };

    const newTemplate: SavedTemplate = {
      ...template,
      id: createTemplateId(),
      gradeWeights: Array(template.gradeCount).fill(
        100 / template.gradeCount
      ),
      students: [newStudent],
    };

    setSavedTemplates((currentTemplates) => [
      ...currentTemplates,
      newTemplate,
    ]);
    setActiveTemplate(null);
    setCurrentView("professor-panel");
    setShowTemplateForm(false);
  };

  const openTemplateSourceChoice = () => {
    setShowTemplateSourceChoice(true);
    setShowTemplateForm(false);
    setActiveTemplate(null);
  };

  const createLocalTemplate = () => {
    setShowTemplateSourceChoice(false);
    setShowTemplateForm(true);
  };

  const importTemplateFromExcel = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = worksheet
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)
        : [];
      const firstRow = rows[0];
      const gradeHeaders = firstRow
        ? Object.keys(firstRow)
            .filter((header) => /^Grade \d+$/.test(header))
            .sort((a, b) => Number(a.replace("Grade ", "")) - Number(b.replace("Grade ", "")))
        : [];

      if (!gradeHeaders.length || gradeHeaders.length > 10) {
        throw new Error(t("importInvalidGrade"));
      }

      const students: Student[] = rows
        .filter((row) => String(row.Student ?? "").trim())
        .map((row, index) => ({
          id: index + 1,
          name: String(row.Student).trim(),
          grades: gradeHeaders.map((header) => {
            const value = row[header];
            return value === undefined || value === null || String(value).trim() === ""
              ? null
              : Number(value);
          }),
        }));

      if (!students.length) throw new Error(t("importNoStudents"));

      const importedTemplate: SavedTemplate = {
        id: createTemplateId(),
        name: file.name.replace(/\.(xlsx|xls)$/i, ""),
        gradingScale: "0-5",
        gradeCount: gradeHeaders.length,
        gradeWeights: Array(gradeHeaders.length).fill(100 / gradeHeaders.length),
        students,
      };

      setSavedTemplates((currentTemplates) => [...currentTemplates, importedTemplate]);
      setShowTemplateSourceChoice(false);
      setCurrentView("professor-panel");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("importError"));
    } finally {
      event.target.value = "";
    }
  };

  const navigateTo = (
    view: "overview" | "professor-panel" | "student-panel" | "settings"
  ) => {
    setCurrentView(view);
    setActiveTemplate(null);
    setShowTemplateForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalStudents = savedTemplates.reduce(
    (total, template) => total + template.students.length,
    0
  );

  const studentsNeedingAttention = savedTemplates.reduce(
    (total, template) =>
      total +
      template.students.filter((student) => {
        const hasCompleteGrades =
          student.grades.length > 0 &&
          student.grades.every((grade) => grade !== null);
        const average = calculateWeightedAverage(
          student.grades,
          template.gradeWeights
        );

        return (
          hasCompleteGrades &&
          getAcademicStatus(average, template.gradingScale) === "failing"
        );
      }).length,
    0
  );

  const strugglingStudents = savedTemplates.flatMap((template) =>
    template.students.flatMap((student) => {
      const hasCompleteGrades =
        student.grades.length > 0 &&
        student.grades.every((grade) => grade !== null);
      const average = calculateWeightedAverage(
        student.grades,
        template.gradeWeights
      );
      const status = getAcademicStatus(average, template.gradingScale);

      if (!hasCompleteGrades || status !== "failing") {
        return [];
      }

      return [{
        id: `${template.id}-${student.id}`,
        name: student.name,
        templateName: template.name,
        average,
        status,
      }];
    })
  );

  const unreadStrugglingStudents = strugglingStudents.filter(
    (student) => !dismissedNotifications.includes(student.id)
  );
  const failingStudentCount = new Set(
    strugglingStudents.map((student) => student.name.trim().toLowerCase())
  ).size;

  const toggleNotification = (notificationId: string) => {
    setDismissedNotifications((currentNotifications) =>
      currentNotifications.includes(notificationId)
        ? currentNotifications.filter((id) => id !== notificationId)
        : [...currentNotifications, notificationId]
    );
  };

  const getTemplateAverage = (template: SavedTemplate) => {
    if (template.students.length === 0) {
      return 0;
    }

    const total = template.students.reduce(
      (sum, student) =>
        sum +
        calculateWeightedAverage(student.grades, template.gradeWeights),
      0
    );

    return total / template.students.length;
  };

  const currentHour = new Date().getHours();
  const welcomeMessage =
    currentHour >= 5 && currentHour < 12
      ? t("welcomeMorning")
      : currentHour < 18
      ? t("welcomeAfternoon")
      : t("welcomeEvening");

  const professorTemplates = savedTemplates;

  const nextTemplateName = () => {
    const templateNumbers = savedTemplates
      .map((template) => template.name.match(/^Template\s+(\d+)$/i)?.[1])
      .filter((number): number is string => number !== undefined)
      .map(Number);
    const nextNumber = Math.max(1, ...templateNumbers) + 1;

    return `Template ${String(nextNumber).padStart(2, "0")}`;
  };

  const breadcrumbSection = activeTemplate
    ? t("myTemplates")
    : t("workspace");
  const breadcrumbTitle = activeTemplate
    ? activeTemplate.name
    : currentView === "student-panel"
    ? t("studentPanel")
    : currentView === "settings"
    ? t("settings")
    : currentView === "professor-panel"
    ? t("professorPanel")
    : t("overview");

  const saveTemplate = useCallback((template: SavedTemplate) => {
    setSavedTemplates((currentTemplates) => {
      const alreadySaved = currentTemplates.some(
        (currentTemplate) => currentTemplate.id === template.id
      );

      if (alreadySaved) {
        return currentTemplates.map((currentTemplate) =>
          currentTemplate.id === template.id ? template : currentTemplate
        );
      }

      return [...currentTemplates, template];
    });
  }, []);

  const deleteTemplate = (templateId: string, templateName: string) => {
    const shouldDelete = window.confirm(
      t("deleteTemplateConfirm", { name: templateName })
    );

    if (!shouldDelete) {
      return;
    }

    setSavedTemplates((currentTemplates) =>
      currentTemplates.filter((template) => template.id !== templateId)
    );
  };

  const deleteStudentFromTemplate = (
    templateId: string,
    studentId: number,
    studentName: string
  ) => {
    const shouldDelete = window.confirm(
      t("removeStudentConfirm", { name: studentName })
    );

    if (!shouldDelete) return;

    setSavedTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              students: template.students.filter(
                (student) => student.id !== studentId
              ),
            }
          : template
      )
    );
  };

  const updateStudentGradesFromStudentPanel = (
    templateId: string,
    studentId: number,
    grades: (number | null)[]
  ) => {
    setSavedTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              students: template.students.map((student) =>
                student.id === studentId ? { ...student, grades } : student
              ),
            }
          : template
      )
    );
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigateTo("overview")}>
          <span className="brand-mark"><img src={notePutIcon} alt="" /></span>
          <span>Note<span>Put</span></span>
        </button>

        <p className="sidebar-label">{t("workspace")}</p>
        <nav className="sidebar-nav" aria-label={t("workspace")}>
          <button
            className={!activeTemplate && currentView === "overview" ? "active" : ""}
            type="button"
            onClick={() => navigateTo("overview")}
          >
            <Icon name="dashboard" /> <span>{t("overview")}</span>
          </button>
          <button
            className={!activeTemplate && currentView === "professor-panel" ? "active" : ""}
            type="button"
            onClick={() => navigateTo("professor-panel")}
          >
            <Icon name="template" /> <span>{t("professorPanel")}</span>
            <small>{savedTemplates.length}</small>
          </button>
          <button type="button" onClick={() => navigateTo("student-panel")}>
              <Icon name="users" /> <span>{t("studentPanel")}</span>
              <small>{failingStudentCount}</small>
          </button>
        </nav>

        <p className="sidebar-label">{t("myTemplates")}</p>
        <div className="sidebar-template-list">
          {savedTemplates.slice(0, 5).map((template) => (
            <button
              type="button"
              key={template.id}
              onClick={() => {
                setActiveTemplate(template);
                setCurrentView("professor-panel");
              }}
            >
              <Icon name="template" size={16} />
              {template.name}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button
            className={!activeTemplate && currentView === "settings" ? "active" : ""}
            type="button"
            onClick={() => navigateTo("settings")}
          >
            <Icon name="settings" />
            <span>{t("settings")}</span>
          </button>
        </div>
      </aside>

      <div className="app-content">
        <header className="top-header">
          <div className="breadcrumb">
            {breadcrumbSection} <span>/</span> <strong>{breadcrumbTitle}</strong>
          </div>

          <div className="header-actions">
            <button className="icon-button" type="button" aria-label={t("searchStudents")} onClick={() => { navigateTo("student-panel"); setStudentSearchRequest((request) => request + 1); }}><Icon name="search" /></button>
            <div className="notification-control">
              <button className="icon-button" type="button" aria-label={t("notifications")} onClick={() => setNotificationsOpen((isOpen) => !isOpen)}>
                <Icon name="bell" />
                {unreadStrugglingStudents.length > 0 && <span className="notification-count">{unreadStrugglingStudents.length}</span>}
              </button>
              {notificationsOpen && (
                <div className="notification-menu">
                  <strong>{t("strugglingStudents")}</strong>
                  {strugglingStudents.length === 0 ? (
                    <p>{t("noNotifications")}</p>
                  ) : (
                    strugglingStudents.map((student) => (
                      <div className={`notification-item ${dismissedNotifications.includes(student.id) ? "dismissed" : ""}`} key={student.id}>
                        <label className="notification-check">
                          <input
                            type="checkbox"
                            checked={dismissedNotifications.includes(student.id)}
                            onChange={() => toggleNotification(student.id)}
                            aria-label={`${t("markReviewed")} ${student.name}`}
                          />
                          <span>
                            <strong>{student.name}</strong>
                            <span>{student.templateName}</span>
                            <small>{t("notificationStatus", { status: t("failing"), average: student.average.toFixed(2) })}</small>
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <label className="language-control">
              <span>{t("language")}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          </div>
        </header>

        <div className="main-content">
        {currentView === "student-panel" ? (
          <StudentPanel
            t={t}
            templates={savedTemplates}
              onUpdateTeacherStudentGrades={updateStudentGradesFromStudentPanel}
            onDeleteTeacherStudent={deleteStudentFromTemplate}
            focusSearchRequest={studentSearchRequest}
          />
        ) : currentView === "settings" ? (
          <section className="settings-panel panel">
            <p className="student-directory-eyebrow">{t("settings")}</p>
            <h1>{t("settingsTitle")}</h1>
            <p className="settings-description">{t("settingsDescription")}</p>

            <div className="settings-row">
              <div className="settings-row-label">
                <Icon name={theme === "dark" ? "moon" : "sun"} />
                <div>
                  <strong>{t("appearance")}</strong>
                  <span>{theme === "dark" ? t("nightMode") : t("lightMode")}</span>
                </div>
              </div>
              <button className="button button-secondary" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
                {theme === "dark" ? t("lightMode") : t("nightMode")}
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-label">
                <Icon name="file" />
                <div>
                  <strong>{t("language")}</strong>
                  <span>{t("languagePreference")}</span>
                </div>
              </div>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </section>
        ) : activeTemplate ? (
        <GradeTable
          key={activeTemplate.id}
          templateId={activeTemplate.id}
          templateName={activeTemplate.name}
          gradingScale={activeTemplate.gradingScale}
          gradeCount={activeTemplate.gradeCount}
          initialGradeWeights={activeTemplate.gradeWeights}
          initialStudents={activeTemplate.students}
          initialShowAttendance={activeTemplate.showAttendance}
          initialAttendance={activeTemplate.attendance}
          onSaveTemplate={saveTemplate}
          t={t}
          onBackToTemplate={(template) => {
            saveTemplate(template);
            setActiveTemplate(null);
            setCurrentView("professor-panel");
          }}
        />
        ) : showTemplateForm ? (
          <div id="new-template-form">
            <TemplateForm
              onCreateTemplate={createTemplate}
              initialTemplateName={nextTemplateName()}
              t={t}
            />
          </div>
        ) : currentView === "overview" ? (
          <section className="dashboard">
            <section className="about-noteput-section">
              <div className="about-noteput-intro">
                <div>
                  <p className="about-noteput-eyebrow">{t("aboutNotePut")}</p>
                  <h2>{t("aboutHeadline")}</h2>
                  <p>{t("aboutDescription")}</p>
                </div>
                <div className="about-noteput-mark" aria-hidden="true">
                  <img src={notePutIcon} alt="" />
                </div>
              </div>

              <div className="about-noteput-cards">
                <article className="about-noteput-card">
                  <p className="about-noteput-eyebrow">{t("ourPurpose")}</p>
                  <h3>{t("purposeTitle")}</h3>
                  <p>{t("purposeDescription")}</p>
                  <p>{t("purposeDescriptionTwo")}</p>
                </article>
                <article className="about-noteput-card">
                  <p className="about-noteput-eyebrow">{t("whatYouCanDo")}</p>
                  <div className="about-feature-list">
                    <div><span><Icon name="file" size={20} /></span><p><strong>{t("editableGradeSheets")}</strong>{t("editableGradeSheetsDescription")}</p></div>
                    <div><span><Icon name="users" size={20} /></span><p><strong>{t("studentProgress")}</strong>{t("studentProgressDescription")}</p></div>
                    <div><span><Icon name="upload" size={20} /></span><p><strong>{t("excelFriendly")}</strong>{t("excelFriendlyDescription")}</p></div>
                  </div>
                </article>
              </div>
            </section>

            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-icon"><Icon name="template" /></span>
                <div><small>{t("activeTemplates")}</small><strong>{savedTemplates.length}</strong><span>2 {t("editedThisWeek")}</span></div>
              </article>
              <article className="stat-card">
                <span className="stat-icon"><Icon name="users" /></span>
                <div><small>{t("totalStudents")}</small><strong>{totalStudents}</strong><span>{t("acrossAllClasses")}</span></div>
              </article>
              <article className="stat-card stat-card-warning">
                <span className="stat-icon"><Icon name="warning" /></span>
                <div><small>{t("needsAttention")}</small><strong>{studentsNeedingAttention}</strong><span>{t("studentsFailing")}</span></div>
              </article>
            </div>

            <section className="recent-section" id="recent-templates">
              <div className="section-heading">
                <div><h2>{t("recentTemplates")}</h2><p>{t("pickUpWhereLeftOff")}</p></div>
                <button className="text-button" type="button" onClick={() => navigateTo("professor-panel")}>{t("viewAllTemplates")} <Icon name="arrow-right" size={15} /></button>
              </div>

              <div className="recent-grid">
                {savedTemplates.slice(0, 3).map((template) => (
                  <article className="recent-card" key={template.id}>
                    <button type="button" onClick={() => setActiveTemplate(template)}>
                      <span className="recent-icon"><Icon name="template" /></span>
                      <strong>{template.name}</strong>
                      <small>{template.students.length} {t("students")} · {getTemplateAverage(template).toFixed(1)} {t("average").toLowerCase()}</small>
                    </button>
                    <button className="template-card-delete" type="button" onClick={() => deleteTemplate(template.id, template.name)}>{t("delete")}</button>
                  </article>
                ))}
                <button className="create-card" type="button" onClick={openTemplateSourceChoice}>
                  <span><Icon name="plus" size={26} /></span><strong>{t("createBlankTemplate")}</strong><small>{t("startBlankGradeSheet")}</small>
                </button>
              </div>
            </section>
          </section>
        ) : (
          <ProfessorPanel
            templates={professorTemplates}
            welcomeMessage={welcomeMessage}
            onOpenTemplate={(template) => {
              setActiveTemplate(template);
              setCurrentView("professor-panel");
            }}
            onCreateTemplate={() => {
              openTemplateSourceChoice();
            }}
            onDeleteTemplate={(template) =>
              deleteTemplate(template.id, template.name)
            }
            t={t}
          />
        )}
        </div>
      </div>
      {showTemplateSourceChoice && (
        <div className="template-source-backdrop" role="presentation">
          <section className="template-source-card" role="dialog" aria-modal="true" aria-labelledby="template-source-title">
            <button className="template-source-close" type="button" onClick={() => setShowTemplateSourceChoice(false)} aria-label={t("cancel")}>×</button>
            <p className="student-directory-eyebrow">{t("createTemplate")}</p>
            <h2 id="template-source-title">{t("chooseTemplateSource")}</h2>
            <div className="template-source-options">
              <button type="button" onClick={createLocalTemplate}>
                <Icon name="template" size={24} />
                <strong>{t("localTemplate")}</strong>
                <small>{t("localTemplateDescription")}</small>
              </button>
              <label>
                <Icon name="upload" size={24} />
                <strong>{t("excelTemplate")}</strong>
                <small>{t("excelTemplateDescription")}</small>
                <input type="file" accept=".xlsx,.xls" onChange={importTemplateFromExcel} />
              </label>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
