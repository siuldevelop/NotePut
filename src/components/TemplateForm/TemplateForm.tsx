import { useState } from "react";
import type { TemplateMetadata } from "../../types/Template";
import type { Translator } from "../../utils/i18n";

interface TemplateFormProps {
  onCreateTemplate: (template: TemplateMetadata) => void;
  t: Translator;
  initialTemplateName?: string;
}

function TemplateForm({
  onCreateTemplate,
  t,
  initialTemplateName = "Template 01",
}: TemplateFormProps) {
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [gradingScale, setGradingScale] = useState("0-5");

  const [gradeCount, setGradeCount] = useState(5);
  const [gradeCountInput, setGradeCountInput] = useState("5");
  const [gradeCountError, setGradeCountError] = useState(false);

  const handleCreateTemplate = () => {
    if (gradeCountError) {
      return;
    }

    const template: TemplateMetadata = {
      name: templateName,
      gradingScale,
      gradeCount,
    };

    onCreateTemplate(template);
  };

  return (
    <section className="template-form panel">
      <h2>{t("createTemplate")}</h2>

      <div className="form-field">
        <label htmlFor="templateName">
          {t("templateName")}
        </label>

        <input
          id="templateName"
          type="text"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="gradingScale">
          {t("gradingScale")}
        </label>

        <select
          id="gradingScale"
          value={gradingScale}
          onChange={(event) => setGradingScale(event.target.value)}
        >
          <option value="0-5">0.0 - 5.0</option>
          <option value="0-100">0 - 100</option>
          <option value="0-1">0 - 1</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="gradeCount">
          {t("numberOfGrades")}
        </label>

        <input
          id="gradeCount"
          type="text"
          value={gradeCountInput}
          onChange={(event) => {
            const value = event.target.value;

            setGradeCountInput(value);

            const numberValue = Number(value);

            const isInvalid =
              value === "" ||
              value === "-" ||
              Number.isNaN(numberValue) ||
              numberValue < 1 ||
              numberValue > 10;

            setGradeCountError(isInvalid);

            if (!isInvalid) {
              setGradeCount(numberValue);
            }
          }}
          style={{
            border: gradeCountError
              ? "2px solid red"
              : undefined,
          }}
        />

        {gradeCountError && (
          <p style={{ color: "red" }}>
            {t("gradeCountError")}
          </p>
        )}
      </div>

      <button type="button" onClick={handleCreateTemplate}>
        {t("create")}
      </button>
    </section>
  );
}

export default TemplateForm;
