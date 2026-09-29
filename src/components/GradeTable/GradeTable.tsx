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
  return (
    <section>
      <h2>{templateName}</h2>

      <p>Grading scale: {gradingScale}</p>

      <table>
        <thead>
          <tr>
            <th>Student</th>

            {Array.from({ length: gradeCount }, (_, index) => (
              <th key={index}>Grade {index + 1}</th>
            ))}

            <th>Average</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Juan Pérez</td>

            {Array.from({ length: gradeCount }, (_, index) => (
              <td key={index}>
                <input type="number" />
              </td>
            ))}

            <td>—</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export default GradeTable;