import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import TemplateForm from "./components/TemplateForm/TemplateForm";
import GradeTable from "./components/GradeTable/GradeTable";
import StudentPanel from "./components/StudentPanel/StudentPanel";
import ProfessorPanel from "./components/ProfessorPanel/ProfessorPanel";
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
    "overview" | "professor-panel" | "student-panel"
  >(
    "overview"
  );
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [dashboardImportError, setDashboardImportError] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    return localStorage.getItem(LANGUAGE_KEY) === "es" ? "es" : "en";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  });
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

  const createTemplate = (template: TemplateMetadata) => {
    const newStudent: Student = {
      id: 1,
      name: "Juan Pérez",
      grades: Array(template.gradeCount).fill(null),
    };

    setActiveTemplate({
      ...template,
      id: createTemplateId(),
      gradeWeights: Array(template.gradeCount).fill(
        100 / template.gradeCount
      ),
      students: [newStudent],
    });
    setCurrentView("professor-panel");
    setShowTemplateForm(false);
  };

  const importTemplateFromExcel = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
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
      const firstRow = rows[0];
      const gradeHeaders = firstRow
        ? Object.keys(firstRow)
            .filter((header) => /^Grade \d+$/.test(header))
            .sort(
              (firstHeader, secondHeader) =>
                Number(firstHeader.replace("Grade ", "")) -
                Number(secondHeader.replace("Grade ", ""))
            )
        : [];

      if (gradeHeaders.length === 0) {
        throw new Error(t("importNoGradeColumns"));
      }

      if (gradeHeaders.length > 10) {
        throw new Error(t("importTooManyGradeColumns"));
      }

      const students: Student[] = rows
        .filter((row) => String(row.Student ?? "").trim() !== "")
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

      if (students.length === 0) {
        throw new Error(t("importNoStudents"));
      }

      const importedTemplate: SavedTemplate = {
        id: createTemplateId(),
        name: file.name.replace(/\.(xlsx|xls)$/i, ""),
        gradingScale: "0-5",
        gradeCount: gradeHeaders.length,
        gradeWeights: Array(gradeHeaders.length).fill(
          100 / gradeHeaders.length
        ),
        students,
      };

      setSavedTemplates((currentTemplates) => [
        ...currentTemplates,
        importedTemplate,
      ]);
      setActiveTemplate(importedTemplate);
      setDashboardImportError("");
    } catch (error) {
      setDashboardImportError(
        error instanceof Error
          ? error.message
          : t("importDashboardError")
      );
    } finally {
      event.target.value = "";
    }
  };

  const navigateTo = (
    view: "overview" | "professor-panel" | "student-panel"
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
        const average = calculateWeightedAverage(
          student.grades,
          template.gradeWeights
        );

        return getAcademicStatus(average, template.gradingScale) !== "passing";
      }).length,
    0
  );

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

  const formattedDate = new Intl.DateTimeFormat(
    language === "es" ? "es-CO" : "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  )
    .format(new Date())
    .toUpperCase();

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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => navigateTo("overview")}>
          <span className="brand-mark">▣</span>
          <span>Note<span>Put</span></span>
        </button>

        <p className="sidebar-label">{t("workspace")}</p>
        <nav className="sidebar-nav" aria-label={t("workspace")}>
          <button
            className={!activeTemplate && currentView === "overview" ? "active" : ""}
            type="button"
            onClick={() => navigateTo("overview")}
          >
            ▦ <span>{t("overview")}</span>
          </button>
          <button
            className={!activeTemplate && currentView === "professor-panel" ? "active" : ""}
            type="button"
            onClick={() => navigateTo("professor-panel")}
          >
            ▤ <span>{t("professorPanel")}</span>
            <small>{savedTemplates.length}</small>
          </button>
          <button type="button" onClick={() => navigateTo("student-panel")}>
            ♙ <span>{t("students")}</span>
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
              {template.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="app-content">
        <header className="top-header">
          <div className="breadcrumb">
            {breadcrumbSection} <span>/</span> <strong>{breadcrumbTitle}</strong>
          </div>

          <div className="header-actions">
            <button className="icon-button" type="button" aria-label={t("studentPanel")} onClick={() => navigateTo("student-panel")}>⌕</button>
            <button className="icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "☀" : "☾"}
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
            onDeleteTeacherStudent={deleteStudentFromTemplate}
          />
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
            <div className="dashboard-heading">
              <div>
                <p className="dashboard-date">{formattedDate}</p>
                <h1>{t("welcome")}</h1>
                <p>{t("dashboardSubtitle")}</p>
              </div>
              <div className="dashboard-actions">
                <label className="button button-secondary dashboard-import-button">
                  {t("import")}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importTemplateFromExcel}
                  />
                </label>
                <button className="button button-primary" type="button" onClick={() => setShowTemplateForm(true)}>
                  + {t("newTemplate")}
                </button>
              </div>
            </div>

            {dashboardImportError && (
              <p className="error-message dashboard-import-error">
                {dashboardImportError}
              </p>
            )}

            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-icon">▤</span>
                <div><small>{t("activeTemplates")}</small><strong>{savedTemplates.length}</strong><span>2 {t("editedThisWeek")}</span></div>
              </article>
              <article className="stat-card">
                <span className="stat-icon">♙</span>
                <div><small>{t("totalStudents")}</small><strong>{totalStudents}</strong><span>{t("acrossAllClasses")}</span></div>
              </article>
              <article className="stat-card stat-card-warning">
                <span className="stat-icon">▣</span>
                <div><small>{t("needsAttention")}</small><strong>{studentsNeedingAttention}</strong><span>{t("studentsAtRisk")}</span></div>
              </article>
            </div>

            <section className="recent-section" id="recent-templates">
              <div className="section-heading">
                <div><h2>{t("recentTemplates")}</h2><p>{t("pickUpWhereLeftOff")}</p></div>
                <button className="text-button" type="button" onClick={() => navigateTo("professor-panel")}>{t("viewAllTemplates")} →</button>
              </div>

              <div className="recent-grid">
                {savedTemplates.slice(0, 3).map((template) => (
                  <article className="recent-card" key={template.id}>
                    <button type="button" onClick={() => setActiveTemplate(template)}>
                      <span className="recent-icon">▤</span>
                      <strong>{template.name}</strong>
                      <small>{template.students.length} {t("students")} · {getTemplateAverage(template).toFixed(1)} {t("average").toLowerCase()}</small>
                    </button>
                    <button className="template-card-delete" type="button" onClick={() => deleteTemplate(template.id, template.name)}>{t("delete")}</button>
                  </article>
                ))}
                <button className="create-card" type="button" onClick={() => setShowTemplateForm(true)}>
                  <span>＋</span><strong>{t("createBlankTemplate")}</strong><small>{t("startBlankGradeSheet")}</small>
                </button>
              </div>
            </section>
          </section>
        ) : (
          <ProfessorPanel
            templates={professorTemplates}
            onOpenTemplate={(template) => {
              setActiveTemplate(template);
              setCurrentView("professor-panel");
            }}
            onCreateTemplate={() => {
              setShowTemplateForm(true);
              setActiveTemplate(null);
            }}
            onDeleteTemplate={(template) =>
              deleteTemplate(template.id, template.name)
            }
            t={t}
          />
        )}
        </div>
      </div>
    </main>
  );
}

export default App;
