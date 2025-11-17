import type { Employee } from '../services/api';

interface EmployeeListProps {
  employees: Employee[];
  // onEdit: (employee: Employee) => void; // Implémentation future
  // onDelete: (employeeId: string) => void; // Implémentation future
}

export default function EmployeeList({ employees }: EmployeeListProps) {
  if (employees.length === 0) {
    return <p>Cette entreprise n'a pas encore d'employé.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Prénom</th>
          <th>Nom</th>
          <th>Email</th>
          <th>Salaire Brut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr key={employee.id}>
            <td>{employee.firstName}</td>
            <td>{employee.lastName}</td>
            <td>{employee.email}</td>
            <td>{employee.grossSalary} €</td>
            <td>
              <button>Modifier</button>
              <button>Supprimer</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
