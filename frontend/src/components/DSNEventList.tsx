import { useState, useEffect, useCallback } from 'react';
import { getDSNEvents, deleteDSNEvent, validateDSNEvent, type DSNEvent } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DSN_EVENT_TYPE_LABELS } from '../constants/dsn';
import styles from './DSNEventList.module.css';

interface DSNEventListProps {
  companyId: string;
  onEventCreated?: () => void;
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  VALIDE: 'Validé',
  DECLARE: 'Déclaré',
  ERREUR: 'Erreur',
};

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: '#808080',
  VALIDE: '#4CAF50',
  DECLARE: '#2196F3',
  ERREUR: '#f44336',
};

export default function DSNEventList({ companyId }: DSNEventListProps) {
  const [events, setEvents] = useState<DSNEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const loadEvents = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await getDSNEvents(companyId, token);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = async (eventId: string) => {
    if (!token) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }

    try {
      await deleteDSNEvent(companyId, eventId, token);
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleValidate = async (eventId: string) => {
    if (!token) return;

    if (!confirm('Êtes-vous sûr de vouloir valider cet événement ?')) {
      return;
    }

    try {
      await validateDSNEvent(companyId, eventId, token);
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la validation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className={styles.loading}>Chargement des événements DSN...</div>;
  }

  if (error) {
    return <div className={styles.error}>Erreur : {error}</div>;
  }

  if (events.length === 0) {
    return <div className={styles.empty}>Aucun événement DSN enregistré</div>;
  }

  return (
    <div className={styles.container}>
      <h3>Événements DSN</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Employé</th>
            <th>Date événement</th>
            <th>Statut</th>
            <th>Motif</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{DSN_EVENT_TYPE_LABELS[event.typeEvenement] || event.typeEvenement}</td>
              <td>
                {event.employe
                  ? `${event.employe.prenom} ${event.employe.nom}`
                  : 'Employé inconnu'}
              </td>
              <td>{formatDate(event.dateEvenement)}</td>
              <td>
                <span
                  className={styles.badge}
                  style={{ backgroundColor: STATUT_COLORS[event.statut] }}
                >
                  {STATUT_LABELS[event.statut] || event.statut}
                </span>
              </td>
              <td>{event.motif || '-'}</td>
              <td className={styles.actions}>
                {event.statut === 'BROUILLON' && (
                  <>
                    <button
                      onClick={() => handleValidate(event.id)}
                      className={styles.validateBtn}
                      title="Valider l'événement"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className={styles.deleteBtn}
                      title="Supprimer l'événement"
                    >
                      Supprimer
                    </button>
                  </>
                )}
                {event.statut === 'ERREUR' && (
                  <button
                    onClick={() => handleDelete(event.id)}
                    className={styles.deleteBtn}
                    title="Supprimer l'événement"
                  >
                    Supprimer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
