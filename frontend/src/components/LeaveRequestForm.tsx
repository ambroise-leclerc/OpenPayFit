import { useState } from 'react';
import type { CreateLeaveData, LeaveType } from '../services/api';
import styles from './LeaveRequestForm.module.css';

interface LeaveRequestFormProps {
  onSubmit: (leaveData: CreateLeaveData) => void;
  onCancel?: () => void;
}

const initialFormState: CreateLeaveData = {
  type: 'PAID_LEAVE',
  startDate: '',
  endDate: '',
  days: 1,
  reason: '',
};

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'PAID_LEAVE', label: 'Congés payés' },
  { value: 'SICK_LEAVE', label: 'Arrêt maladie' },
  { value: 'UNPAID_LEAVE', label: 'Congé sans solde' },
  { value: 'PARENTAL_LEAVE', label: 'Congé parental' },
  { value: 'OTHER', label: 'Autre' },
];

export default function LeaveRequestForm({ onSubmit, onCancel }: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<CreateLeaveData>(initialFormState);
  const [error, setError] = useState<string>('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'days' ? parseFloat(value) || 0 : value,
    }));
    setError(''); // Réinitialiser l'erreur lors de la modification
  };

  // Calculer automatiquement le nombre de jours entre deux dates
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) return 0;

    // Calculer le nombre de jours (en comptant les week-ends)
    // Note : Math.abs() n'est pas nécessaire ici car la garde ci-dessus garantit startDate <= endDate
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le dernier jour

    return diffDays;
  };

  // Mettre à jour automatiquement le nombre de jours quand les dates changent
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };

    if (name === 'startDate' || name === 'endDate') {
      const calculatedDays = calculateDays(
        name === 'startDate' ? value : formData.startDate,
        name === 'endDate' ? value : formData.endDate
      );
      newFormData.days = calculatedDays;
    }

    setFormData(newFormData);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.type || !formData.startDate || !formData.endDate || formData.days <= 0) {
      setError('Veuillez remplir tous les champs requis.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate > endDate) {
      setError('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    onSubmit(formData);
    setFormData(initialFormState); // Réinitialiser le formulaire
  };

  return (
    <form onSubmit={handleSubmit} className={styles.leaveRequestForm}>
      <h3>Nouvelle demande de congé</h3>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.formGroup}>
        <label htmlFor="type">Type de congé*</label>
        <select id="type" name="type" value={formData.type} onChange={handleChange} required>
          {leaveTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="startDate">Date de début*</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleDateChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="endDate">Date de fin*</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleDateChange}
            required
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="days">Nombre de jours*</label>
        <input
          type="number"
          id="days"
          name="days"
          value={formData.days}
          onChange={handleChange}
          min="0.5"
          step="0.5"
          required
        />
        <small>Ce champ est calculé automatiquement selon les dates sélectionnées.</small>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="reason">Raison (optionnel)</label>
        <textarea
          id="reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          rows={3}
          placeholder="Ex: Vacances d'été, rendez-vous médical..."
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.btnSubmit}>
          Soumettre la demande
        </button>
        {onCancel && (
          <button type="button" className={styles.btnCancel} onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
