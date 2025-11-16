import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getPayslipById,
  downloadPayslipPDF,
  ApiError,
  type Payslip,
} from '../services/api';
import styles from './PayslipDetailPage.module.css';

function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    loadPayslip();
  }, [id]);

  const loadPayslip = async () => {
    if (!token || !id) {
      setError('Identifiants manquants');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getPayslipById(id, token);
      setPayslip(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la fiche de paie';
      setError(message);

      // Déconnecter si erreur d'authentification ou d'autorisation
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!token || !id) return;

    setDownloading(true);
    setError('');

    try {
      await downloadPayslipPDF(id, token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF';
      setError(message);

      // Déconnecter si erreur d'authentification ou d'autorisation
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPeriod = (period: string): string => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Chargement...</div>
      </div>
    );
  }

  if (error && !payslip) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => navigate('/payroll')} className={styles.backButton}>
          Retour à la liste
        </button>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Fiche de paie non trouvée</div>
        <button onClick={() => navigate('/payroll')} className={styles.backButton}>
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Fiche de Paie</h1>
        <div className={styles.actions}>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className={styles.downloadButton}
          >
            {downloading ? 'Téléchargement...' : '📥 Télécharger PDF'}
          </button>
          <Link to="/payroll" className={styles.backLink}>
            Retour à la liste
          </Link>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Période</h2>
          <div className={styles.period}>{formatPeriod(payslip.payPeriod)}</div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employé</h2>
          <div className={styles.employeeInfo}>
            {payslip.employeeFirstName && payslip.employeeLastName ? (
              <div className={styles.employeeName}>
                {payslip.employeeFirstName} {payslip.employeeLastName}
              </div>
            ) : (
              <div className={styles.employeeId}>ID: {payslip.employeeId}</div>
            )}
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Détail de la rémunération</h2>

          <div className={styles.salaryDetail}>
            <div className={styles.row}>
              <span className={styles.label}>Salaire brut</span>
              <span className={styles.amount}>{formatCurrency(payslip.grossSalary)}</span>
            </div>

            <div className={styles.deductionsSection}>
              <div className={styles.deductionsTitle}>Cotisations sociales</div>
              <div className={styles.row}>
                <span className={styles.label}>Cotisations salariales (25%)</span>
                <span className={styles.amount}>- {formatCurrency(payslip.deductions)}</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.row + ' ' + styles.netRow}>
              <span className={styles.label}>Salaire net à payer</span>
              <span className={styles.amount + ' ' + styles.netAmount}>
                {formatCurrency(payslip.netSalary)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.note}>
            <strong>Note :</strong> Les cotisations sociales sont calculées à un taux simplifié de 25% du salaire brut pour ce MVP.
          </div>
          <div className={styles.metadata}>
            <div>Document généré le {formatDate(payslip.createdAt)}</div>
            <div className={styles.id}>ID : {payslip.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayslipDetailPage;
