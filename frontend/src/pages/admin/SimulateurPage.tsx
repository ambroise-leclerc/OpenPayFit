import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { simulateCotisations, type SimulationResult } from '../../services/api';
import styles from './SimulateurPage.module.css';

function SimulateurPage() {
  const { token } = useAuth();
  const [salaireBrut, setSalaireBrut] = useState('3000');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();

    if (!token) return;

    const montant = parseFloat(salaireBrut);
    if (isNaN(montant) || montant <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const simulationResult = await simulateCotisations(montant, date, token);
      setResult(simulationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la simulation');
    } finally {
      setLoading(false);
    }
  }

  function formatEuro(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  return (
    <div className={styles.container}>
      <h1>Simulateur de Cotisations</h1>
      <p className={styles.description}>
        Simulez le calcul des cotisations sociales pour un salaire brut donné à une date spécifique.
      </p>

      <form onSubmit={handleSimulate} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="salaireBrut">Salaire brut mensuel</label>
          <input
            type="number"
            id="salaireBrut"
            value={salaireBrut}
            onChange={(e) => setSalaireBrut(e.target.value)}
            step="0.01"
            min="0"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="date">Date de calcul</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} className={styles.btnPrimary}>
          {loading ? 'Calcul en cours...' : 'Simuler'}
        </button>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.results}>
          <h2>Résultats de la simulation</h2>

          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Salaire brut</div>
              <div className={styles.summaryValue}>{formatEuro(result.salaireBrut)}</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Cotisations salariales</div>
              <div className={styles.summaryValue + ' ' + styles.negative}>
                -{formatEuro(result.cotisationsSalariales)}
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Salaire net</div>
              <div className={styles.summaryValue + ' ' + styles.primary}>
                {formatEuro(result.salaireNet)}
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Cotisations patronales</div>
              <div className={styles.summaryValue}>{formatEuro(result.cotisationsPatronales)}</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Coût total employeur</div>
              <div className={styles.summaryValue}>{formatEuro(result.coutTotal)}</div>
            </div>
          </div>

          <h3>Détail des cotisations</h3>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Cotisation</th>
                  <th>Catégorie</th>
                  <th>Type</th>
                  <th>Assiette</th>
                  <th>Taux</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((detail, index) => (
                  <tr key={index}>
                    <td>
                      <code>{detail.code}</code>
                    </td>
                    <td>{detail.nom}</td>
                    <td>{detail.categorie}</td>
                    <td>
                      <span className={styles[`type-${detail.typeCotisation}`]}>
                        {detail.typeCotisation === 'COTISATION_SALARIALE' && 'Salariale'}
                        {detail.typeCotisation === 'COTISATION_PATRONALE' && 'Patronale'}
                        {detail.typeCotisation === 'CHARGE_FISCALE' && 'Fiscale'}
                      </span>
                    </td>
                    <td>{formatEuro(detail.assiette)}</td>
                    <td>{formatPercent(detail.taux)}</td>
                    <td className={styles.amount}>{formatEuro(detail.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className={styles.totalLabel}>
                    Total cotisations salariales
                  </td>
                  <td className={styles.totalValue}>{formatEuro(result.cotisationsSalariales)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className={styles.totalLabel}>
                    Total cotisations patronales
                  </td>
                  <td className={styles.totalValue}>{formatEuro(result.cotisationsPatronales)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulateurPage;
