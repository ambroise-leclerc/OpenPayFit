import { useState } from 'react';
import type { CreateEmployeeData } from '../services/api';

interface EmployeeFormProps {
  // onSubmit: (employeeData: CreateEmployeeData) => void; // Future implementation
  // initialData?: Employee; // For editing
}

const initialFormState: CreateEmployeeData = {
  firstName: '',
  lastName: '',
  email: '',
  grossSalary: 0,
};

export default function EmployeeForm({}: EmployeeFormProps) {
  const [formData, setFormData] = useState<CreateEmployeeData>(initialFormState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'grossSalary' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // onSubmit(formData);
    console.log('Submitting:', formData);
    alert('Fonctionnalité à implémenter');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Ajouter un employé</h3>
      <div>
        <label htmlFor="firstName">Prénom</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="lastName">Nom</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="grossSalary">Salaire Brut (€)</label>
        <input
          type="number"
          id="grossSalary"
          name="grossSalary"
          value={formData.grossSalary}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">Enregistrer</button>
    </form>
  );
}
