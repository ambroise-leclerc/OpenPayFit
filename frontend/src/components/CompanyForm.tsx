import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompany } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { CreateCompanyData } from '../services/api';

const initialFormState: CreateCompanyData = {
  name: '',
};

export default function CompanyForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateCompanyData>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      await createCompany(formData, token);
      navigate('/dashboard'); // Redirect to dashboard on success
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Créer une entreprise</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label htmlFor="name">Nom de l'entreprise</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
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
