import { Leave, LeaveBalance, LeaveType, LeaveStatus } from '../services/api';
import './LeaveList.module.css';

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
  PENDING: 'status-pending',
  APPROVED: 'status-approved',
  REJECTED: 'status-rejected',
  CANCELLED: 'status-cancelled',
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
    <div className="leave-list">
      {/* Section des soldes de congés */}
      <div className="leave-balances">
        <h3>Soldes de congés</h3>
        {balances.length === 0 ? (
          <p>Aucun solde de congés disponible.</p>
        ) : (
          <div className="balances-grid">
            {balances.map((balance) => (
              <div key={balance.id} className="balance-card">
                <h4>{leaveTypeLabels[balance.type]}</h4>
                <div className="balance-info">
                  <p>
                    <strong>Total:</strong> {balance.totalDays} jours
                  </p>
                  <p>
                    <strong>Utilisés:</strong> {balance.usedDays} jours
                  </p>
                  <p className="remaining-days">
                    <strong>Restants:</strong> {balance.remainingDays} jours
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section des demandes de congés */}
      <div className="leave-requests">
        <h3>Demandes de congés</h3>
        {leaves.length === 0 ? (
          <p>Aucune demande de congé enregistrée.</p>
        ) : (
          <table className="leaves-table">
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
                    <span className={`status-badge ${statusClasses[leave.status]}`}>
                      {leaveStatusLabels[leave.status]}
                    </span>
                  </td>
                  <td>{leave.reason || '-'}</td>
                  <td className="actions">
                    {leave.status === 'PENDING' && onApprove && (
                      <button
                        className="btn-approve"
                        onClick={() => onApprove(leave.id)}
                        title="Approuver"
                      >
                        ✓
                      </button>
                    )}
                    {leave.status === 'PENDING' && onReject && (
                      <button
                        className="btn-reject"
                        onClick={() => onReject(leave.id)}
                        title="Rejeter"
                      >
                        ✗
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="btn-delete"
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
