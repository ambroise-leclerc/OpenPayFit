import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { createDSNEvent, getEmployees, type Employee, type TypeEvenementDSN } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DSN_EVENT_TYPES } from '../constants/dsn';
import styles from './DSNEventForm.module.css';

interface DSNEventFormProps {
  companyId: string;
  onEventCreated: () => void;
}

export default function DSNEventForm({ companyId, onEventCreated }: DSNEventFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [typeEvenement, setTypeEvenement] = useState<TypeEvenementDSN>('EMBAUCHE');
  const [dateEvenement, setDateEvenement] = useState('');
  const [motif, setMotif] = useState('');
  const [commentaires, setCommentaires] = useState('');

  // Champs spécifiques pour arrêt maladie
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const loadEmployees = useCallback(async () => {
    if (!token) return;

    try {
      const data = await getEmployees(companyId, token);
      setEmployees(data);
    } catch (err) {
      console.error('Erreur lors du chargement des employés:', err);
    }
  }, [companyId, token]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Validation côté client
    if (typeEvenement === 'FIN_CONTRAT' && !motif.trim()) {
      setError('Le motif est obligatoire pour une fin de contrat');
      return;
    }

    if (typeEvenement === 'ARRET_MALADIE' && (!dateDebut || !dateFin)) {
      setError('Les dates de début et fin sont obligatoires pour un arrêt maladie');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Préparer les données spécifiques selon le type d'événement
      let donneesSpecifiques: Record<string, unknown> | undefined;

      if (typeEvenement === 'ARRET_MALADIE' && dateDebut && dateFin) {
        donneesSpecifiques = {
          dateDebut,
          dateFin,
        };
      }

      await createDSNEvent(
        companyId,
        {
          employeId: employeeId,
          typeEvenement,
          dateEvenement,
          motif: motif || undefined,
          commentaires: commentaires || undefined,
          donneesSpecifiques,
        },
        token
      );

      // Réinitialiser le formulaire
      setEmployeeId('');
      setTypeEvenement('EMBAUCHE');
      setDateEvenement('');
      setMotif('');
      setCommentaires('');
      setDateDebut('');
      setDateFin('');

      onEventCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>Nouvel événement DSN</h3>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="employee">Employé *</label>
          <select
            id="employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className={styles.input}
          >
            <option value="">Sélectionner un employé</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="typeEvenement">Type d'événement *</label>
          <select
            id="typeEvenement"
            value={typeEvenement}
            onChange={(e) => setTypeEvenement(e.target.value as TypeEvenementDSN)}
            required
            className={styles.input}
          >
            {DSN_EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="dateEvenement">Date de l'événement *</label>
          <input
            type="date"
            id="dateEvenement"
            value={dateEvenement}
            onChange={(e) => setDateEvenement(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        {typeEvenement === 'ARRET_MALADIE' && (
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="dateDebut">Date de début *</label>
              <input
                type="date"
                id="dateDebut"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="dateFin">Date de fin *</label>
              <input
                type="date"
                id="dateFin"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="motif">
            Motif{typeEvenement === 'FIN_CONTRAT' && ' *'}
          </label>
          <input
            type="text"
            id="motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            required={typeEvenement === 'FIN_CONTRAT'}
            placeholder={typeEvenement === 'FIN_CONTRAT' ? 'Obligatoire pour une fin de contrat' : 'Optionnel'}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="commentaires">Commentaires</label>
          <textarea
            id="commentaires"
            value={commentaires}
            onChange={(e) => setCommentaires(e.target.value)}
            rows={3}
            placeholder="Commentaires internes (optionnel)"
            className={styles.textarea}
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Création en cours...' : 'Créer l\'événement'}
          </button>
        </div>
      </form>
    </div>
  );
}
