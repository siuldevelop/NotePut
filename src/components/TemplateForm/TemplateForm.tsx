import { useState } from "react";

interface Template {
  name: string;
  gradingScale: string;
  gradeCount: number;
}

interface TemplateFormProps {
  onCreateTemplate: (template: Template) => void;
}

function TemplateForm({ onCreateTemplate }: TemplateFormProps) {
  const [templateName, setTemplateName] = useState("Template 01");
  const [gradingScale, setGradingScale] = useState("0-5");
  const [gradeCount, setGradeCount] = useState(5);
  const [gradeCountInput, setGradeCountInput] = useState("5");
  const [gradeCountError, setGradeCountError] = useState(false);

  const handleCreateTemplate = () => {
    if (gradeCountError) {
      return;
    }

    const template: Template = {
      name: templateName,
      gradingScale,
      gradeCount,
    };

    onCreateTemplate(template);
  };

  return (
    <section>
      <h2>Create a template</h2>

      <div>
        <label htmlFor="templateName">
          Template name
        </label>

        <input
          id="templateName"
          type="text"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="gradingScale">
          Grading scale
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

      <div>
        <label htmlFor="gradeCount">
          Number of grades
        </label>

        <input
          id="gradeCount"
          type="text"
          inputMode="numeric"
          value={gradeCountInput}
          onChange={(event) => {
            const value = event.target.value;

            setGradeCountInput(value);

            const numberValue = Number(value);

            if (
              value === "" ||
              Number.isNaN(numberValue) ||
              numberValue < 1 ||
              numberValue > 5
            ) {
              setGradeCountError(true);
              return;
            }

            setGradeCountError(false);
            setGradeCount(numberValue);
          }}
          style={{
            border: gradeCountError ? "2px solid red" : undefined,
          }}
        />

        {gradeCountError && (
          <p style={{ color: "red" }}>
            Number of grades must be between 1 and 5.
          </p>
        )}
        
      </div>

      <button type="button" onClick={handleCreateTemplate}>
        Create template
      </button>
    </section>
  );
}

export default TemplateForm;