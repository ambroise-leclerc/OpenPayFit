import { Leave, LeaveBalance, LeaveType, LeaveStatus } from '../services/api';
import styles from './LeaveList.module.css';

interface LeaveListProps {
  leaves: Leave[];
  balances: LeaveBalance[];
  onApprove?: (leaveId: string) => void;
  onReject?: (leaveId: string) => void;
  onDelete?: (leaveId: string) => void;
}

// Traductions des types de congés
const leaveTypeLabels: Record<LeaveType, string> = {
  PAID_LEAVE: 'Congés payés',
  SICK_LEAVE: 'Arrêt maladie',
  UNPAID_LEAVE: 'Congé sans solde',
  PARENTAL_LEAVE: 'Congé parental',
  OTHER: 'Autre',
};

// Traductions des statuts
const leaveStatusLabels: Record<LeaveStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
};

// Classes CSS pour les statuts
const statusClasses: Record<LeaveStatus, string> = {
  PENDING: styles.statusPending,
  APPROVED: styles.statusApproved,
  REJECTED: styles.statusRejected,
  CANCELLED: styles.statusCancelled,
};

export default function LeaveList({
  leaves,
  balances,
  onApprove,
  onReject,
  onDelete,
}: LeaveListProps) {
  // Formater une date au format français
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className={styles.leaveList}>
      {/* Section des soldes de congés */}
      <div className={styles.leaveBalances}>
        <h3>Soldes de congés</h3>
        {balances.length === 0 ? (
          <p>Aucun solde de congés disponible.</p>
        ) : (
          <div className={styles.balancesGrid}>
            {balances.map((balance) => (
              <div key={balance.id} className={styles.balanceCard}>
                <h4>{leaveTypeLabels[balance.type]}</h4>
                <div className={styles.balanceInfo}>
                  <p>
                    <strong>Total:</strong> {balance.totalDays} jours
                  </p>
                  <p>
                    <strong>Utilisés:</strong> {balance.usedDays} jours
                  </p>
                  <p className={styles.remainingDays}>
                    <strong>Restants:</strong> {balance.remainingDays} jours
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section des demandes de congés */}
      <div className={styles.leaveRequests}>
        <h3>Demandes de congés</h3>
        {leaves.length === 0 ? (
          <p>Aucune demande de congé enregistrée.</p>
        ) : (
          <table className={styles.leavesTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Jours</th>
                <th>Statut</th>
                <th>Raison</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id}>
                  <td>{leaveTypeLabels[leave.type]}</td>
                  <td>{formatDate(leave.startDate)}</td>
                  <td>{formatDate(leave.endDate)}</td>
                  <td>{leave.days}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${statusClasses[leave.status]}`}>
                      {leaveStatusLabels[leave.status]}
                    </span>
                  </td>
                  <td>{leave.reason || '-'}</td>
                  <td className={styles.actions}>
                    {leave.status === 'PENDING' && onApprove && (
                      <button
                        className={styles.btnApprove}
                        onClick={() => onApprove(leave.id)}
                        title="Approuver"
                      >
                        ✓
                      </button>
                    )}
                    {leave.status === 'PENDING' && onReject && (
                      <button
                        className={styles.btnReject}
                        onClick={() => onReject(leave.id)}
                        title="Rejeter"
                      >
                        ✗
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className={styles.btnDelete}
                        onClick={() => onDelete(leave.id)}
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
