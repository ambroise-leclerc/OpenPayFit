import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanies,
  runPayroll,
  getPayslips,
  type Company,
  type Payslip,
  type PayrollRunResult,
} from '../services/api';
import styles from './PayrollPage.module.css';

function PayrollPage() {
  const { token, logout } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [payPeriod, setPayPeriod] = useState<string>('');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<string>('');

  // Charger les entreprises au montage du composant
  useEffect(() => {
    loadCompanies();
  }, []);

  // Charger les fiches de paie quand une entreprise est sélectionnée
  useEffect(() => {
    if (selectedCompanyId) {
      loadPayslips();
    }
  }, [selectedCompanyId, filterPeriod]);

  const loadCompanies = async () => {
    if (!token) return;

    try {
      const data = await getCompanies(token);
      setCompanies(data);
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des entreprises';
      setError(message);
      if (message.includes('401') || message.includes('403')) {
        logout();
      }
    }
  };

  const loadPayslips = async () => {
    if (!token || !selectedCompanyId) return;

    setLoading(true);
    setError('');

    try {
      const data = await getPayslips(selectedCompanyId, filterPeriod || null, token);
      setPayslips(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des fiches de paie';
      setError(message);
      if (message.includes('401') || message.includes('403')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !selectedCompanyId || !payPeriod) {
      setError('Veuillez sélectionner une entreprise et une période');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: PayrollRunResult = await runPayroll(
        { companyId: selectedCompanyId, period: payPeriod },
        token
      );

      if (result.status === 'success') {
        setSuccess(`Paie générée avec succès ! ${result.payslipsGenerated} fiche(s) de paie créée(s).`);
        setPayPeriod('');
        // Recharger les fiches de paie
        await loadPayslips();
      } else if (result.errors) {
        setError(`Erreurs lors de la génération : ${result.errors.join(', ')}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la génération de la paie';
      setError(message);
      if (message.includes('401') || message.includes('403')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Générer la valeur par défaut pour le champ période (mois actuel)
  const getDefaultPeriod = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <div className={styles.container}>
      <h1>Gestion de la Paie</h1>

      {/* Sélection de l'entreprise */}
      <div className={styles.companySelector}>
        <label htmlFor="company-select">Entreprise :</label>
        <select
          id="company-select"
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className={styles.select}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Formulaire de génération de paie */}
      <section className={styles.section}>
        <h2>Générer une paie</h2>
        <form onSubmit={handleRunPayroll} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="pay-period">Période de paie (AAAA-MM) :</label>
            <input
              type="month"
              id="pay-period"
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
              placeholder={getDefaultPeriod()}
              className={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Génération en cours...' : 'Générer la paie'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
      </section>

      {/* Filtrage et affichage des fiches de paie */}
      <section className={styles.section}>
        <h2>Fiches de paie</h2>

        <div className={styles.filterGroup}>
          <label htmlFor="filter-period">Filtrer par période :</label>
          <input
            type="month"
            id="filter-period"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={styles.input}
          />
          {filterPeriod && (
            <button
              onClick={() => setFilterPeriod('')}
              className={styles.clearButton}
            >
              Effacer le filtre
            </button>
          )}
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : payslips.length === 0 ? (
          <p className={styles.noData}>Aucune fiche de paie trouvée.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Employé</th>
                  <th>Salaire brut</th>
                  <th>Cotisations</th>
                  <th>Salaire net</th>
                  <th>Date de création</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td>{payslip.payPeriod}</td>
                    <td>{payslip.employeeId}</td>
                    <td>{formatCurrency(payslip.grossSalary)}</td>
                    <td>{formatCurrency(payslip.deductions)}</td>
                    <td className={styles.netSalary}>
                      {formatCurrency(payslip.netSalary)}
                    </td>
                    <td>{formatDate(payslip.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default PayrollPage;
