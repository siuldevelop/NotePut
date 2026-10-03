import type { SavedTemplate } from "../../types/Template";
import {
  calculateWeightedAverage,
} from "../../utils/gradeCalculations";
import type { Translator } from "../../utils/i18n";

interface ProfessorPanelProps {
  templates: SavedTemplate[];
  onOpenTemplate: (template: SavedTemplate) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (template: SavedTemplate) => void;
  t: Translator;
}

function ProfessorPanel({
  templates,
  onOpenTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  t,
}: ProfessorPanelProps) {
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

  return (
    <section className="professor-panel">
      <div className="professor-panel-heading">
        <div>
          <p className="dashboard-date">{t("professorPanel")}</p>
          <h1>{t("myTemplates")}</h1>
          <p>{t("pickUpWhereLeftOff")}</p>
        </div>
        <button className="button button-primary" type="button" onClick={onCreateTemplate}>
          + {t("newTemplate")}
        </button>
      </div>

      <div className="template-gallery-grid">
        {templates.map((template) => (
          <article className="template-gallery-card" key={template.id}>
            <button type="button" onClick={() => onOpenTemplate(template)}>
              <span className="recent-icon">▤</span>
              <strong>{template.name}</strong>
              <small>{t("updatedRecently")}</small>
              <span>
                {template.students.length} {t("students")} · {" "}
                {getTemplateAverage(template).toFixed(1)} {t("average").toLowerCase()}
              </span>
            </button>
            <button
              className="template-card-delete"
              type="button"
              aria-label={`${t("delete")} ${template.name}`}
              onClick={() => onDeleteTemplate(template)}
            >
              <span className="trash-icon" aria-hidden="true">🗑</span>
              <span>{t("delete")}</span>
            </button>
          </article>
        ))}

        <button className="create-card" type="button" onClick={onCreateTemplate}>
          <span>＋</span>
          <strong>{t("createBlankTemplate")}</strong>
          <small>{t("startBlankGradeSheet")}</small>
        </button>
      </div>
    </section>
  );
}

export default ProfessorPanel;
