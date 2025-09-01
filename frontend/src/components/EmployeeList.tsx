import type { Employee } from '../services/api';
import { Link } from 'react-router-dom';

interface EmployeeListProps {
  employees: Employee[];
  // onEdit: (employee: Employee) => void; // Future implementation
  // onDelete: (employeeId: string) => void; // Future implementation
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
              <Link to={`/employees/${employee.id}/payslips`}>
                <button>Fiches de paie</button>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
