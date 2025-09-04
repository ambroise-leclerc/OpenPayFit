import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createEmployee } from '../services/api';
import type { CreateEmployeeData } from '../services/api';

interface EmployeeFormProps {
  companyId: string;
  onEmployeeCreated: () => void;
}

const initialFormState: CreateEmployeeData = {
  firstName: '',
  lastName: '',
  email: '',
  baseHourlyRate: 0,
};

export default function EmployeeForm({ companyId, onEmployeeCreated }: EmployeeFormProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<CreateEmployeeData>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'baseHourlyRate' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Authentication required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createEmployee(companyId, formData, token);
      setFormData(initialFormState); // Reset form
      onEmployeeCreated(); // Notify parent to refetch employees
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Ajouter un employé</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label htmlFor="firstName">Prénom</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
          disabled={submitting}
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
          disabled={submitting}
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
          disabled={submitting}
        />
      </div>
      <div>
        <label htmlFor="baseHourlyRate">Taux horaire de base (€)</label>
        <input
          type="number"
          id="baseHourlyRate"
          name="baseHourlyRate"
          value={formData.baseHourlyRate}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}
