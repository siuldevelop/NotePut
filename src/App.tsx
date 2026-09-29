import { useState } from "react";
import TemplateForm from "./components/TemplateForm/TemplateForm";
import GradeTable from "./components/GradeTable/GradeTable";

function App() {
  const [template, setTemplate] = useState<{
    name: string;
    gradingScale: string;
    gradeCount: number;
  } | null>(null);

  return (
    <main>
      <h1>NotePut</h1>

      <p>
        Digital grade management for teachers.
      </p>

      {!template ? (
        <TemplateForm onCreateTemplate={setTemplate} />
      ) : (
        <GradeTable
          templateName={template.name}
          gradingScale={template.gradingScale}
          gradeCount={template.gradeCount}
        />
      )}
    </main>
  );
}

export default App;