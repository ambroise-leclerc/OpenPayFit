/**
 * Composant d'affichage de l'historique des versions DSN
 * Permet de visualiser, comparer et restaurer les versions précédentes
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getDSNVersions,
  compareDSNVersions,
  restoreDSNVersion,
  exportDSNVersionHistory,
  type DSNVersion,
  type DSNVersionHistorique,
  type ComparisonResult
} from '../services/api';
import styles from './DSNVersionHistory.module.css';

interface DSNVersionHistoryProps {
  companyId: string;
  dsnId: string;
  periode: string;
}

export default function DSNVersionHistory({ companyId, dsnId, periode }: DSNVersionHistoryProps) {
  const { token } = useAuth();
  const [historique, setHistorique] = useState<DSNVersionHistorique | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion1, setSelectedVersion1] = useState<number | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    chargerHistorique();
  }, [dsnId]);

  const chargerHistorique = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getDSNVersions(companyId, dsnId, token);
      setHistorique(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleComparer = async () => {
    if (!token || selectedVersion1 === null || selectedVersion2 === null) return;

    try {
      setLoading(true);
      const result = await compareDSNVersions(companyId, dsnId, selectedVersion1, selectedVersion2, token);
      setComparison(result);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la comparaison');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurer = async (numeroVersion: number) => {
    if (!token) return;

    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir restaurer la version ${numeroVersion} ? ` +
      `Cela créera une nouvelle version avec le contenu de la version ${numeroVersion}.`
    );

    if (!confirmation) return;

    try {
      setLoading(true);
      await restoreDSNVersion(companyId, dsnId, numeroVersion, token);
      alert(`Version ${numeroVersion} restaurée avec succès`);
      await chargerHistorique(); // Recharger l'historique
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    } finally {
      setLoading(false);
    }
  };

  const handleExporter = async (format: 'json' | 'csv') => {
    if (!token) return;

    try {
      setLoading(true);
      const blob = await exportDSNVersionHistory(companyId, dsnId, format, token);

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DSN_Historique_${periode}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const formaterDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseChampsModifies = (champsModifies: string | undefined): string[] => {
    if (!champsModifies) return [];
    try {
      return JSON.parse(champsModifies);
    } catch {
      return [];
    }
  };

  if (loading && !historique) {
    return <div className={styles.loading}>Chargement de l'historique...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Erreur : {error}</p>
        <button onClick={chargerHistorique}>Réessayer</button>
      </div>
    );
  }

  if (!historique || historique.versions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Aucune version disponible pour cette DSN.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Historique des versions - Période {periode}</h2>
        <div className={styles.actions}>
          <button onClick={() => handleExporter('json')} className={styles.exportButton}>
            Exporter JSON
          </button>
          <button onClick={() => handleExporter('csv')} className={styles.exportButton}>
            Exporter CSV
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <p>Nombre total de versions : <strong>{historique.nombreVersions}</strong></p>
      </div>

      {/* Outil de comparaison */}
      <div className={styles.comparisonTool}>
        <h3>Comparer des versions</h3>
        <div className={styles.comparisonControls}>
          <select
            value={selectedVersion1 ?? ''}
            onChange={(e) => setSelectedVersion1(Number(e.target.value))}
          >
            <option value="">Sélectionner version 1</option>
            {historique.versions.map((v) => (
              <option key={v.id} value={v.numeroVersion}>
                Version {v.numeroVersion} - {formaterDate(v.createdAt)}
              </option>
            ))}
          </select>

          <span className={styles.comparisonVs}>vs</span>

          <select
            value={selectedVersion2 ?? ''}
            onChange={(e) => setSelectedVersion2(Number(e.target.value))}
          >
            <option value="">Sélectionner version 2</option>
            {historique.versions.map((v) => (
              <option key={v.id} value={v.numeroVersion}>
                Version {v.numeroVersion} - {formaterDate(v.createdAt)}
              </option>
            ))}
          </select>

          <button
            onClick={handleComparer}
            disabled={selectedVersion1 === null || selectedVersion2 === null || loading}
            className={styles.compareButton}
          >
            Comparer
          </button>
        </div>

        {/* Résultat de la comparaison */}
        {showComparison && comparison && (
          <div className={styles.comparisonResult}>
            <h4>Résultat de la comparaison</h4>
            <p>
              Version {comparison.version1} vs Version {comparison.version2}
            </p>
            <p>
              <strong>{comparison.nombreChangements}</strong> changement(s) détecté(s)
            </p>

            {comparison.differences.length > 0 && (
              <div className={styles.differences}>
                <table>
                  <thead>
                    <tr>
                      <th>Champ</th>
                      <th>Version {comparison.version1}</th>
                      <th>Version {comparison.version2}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.differences.map((diff, index) => (
                      <tr key={index}>
                        <td className={styles.diffField}>{diff.champ}</td>
                        <td className={styles.diffOld}>
                          {typeof diff.ancienneValeur === 'object'
                            ? JSON.stringify(diff.ancienneValeur, null, 2)
                            : diff.ancienneValeur || '-'}
                        </td>
                        <td className={styles.diffNew}>
                          {typeof diff.nouvelleValeur === 'object'
                            ? JSON.stringify(diff.nouvelleValeur, null, 2)
                            : diff.nouvelleValeur || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button onClick={() => setShowComparison(false)} className={styles.closeButton}>
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* Liste des versions */}
      <div className={styles.versionsList}>
        <h3>Toutes les versions</h3>
        <table className={styles.versionsTable}>
          <thead>
            <tr>
              <th>Version</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Modifié par</th>
              <th>Raison</th>
              <th>Champs modifiés</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {historique.versions.map((version) => {
              const champsModifies = parseChampsModifies(version.champsModifies);
              const estVersionActuelle = version.numeroVersion === historique.versions[0].numeroVersion;

              return (
                <tr key={version.id} className={estVersionActuelle ? styles.currentVersion : ''}>
                  <td className={styles.versionNumber}>
                    v{version.numeroVersion}
                    {estVersionActuelle && <span className={styles.badge}>Actuelle</span>}
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[version.statut.toLowerCase()]}`}>
                      {version.statut}
                    </span>
                  </td>
                  <td>{formaterDate(version.createdAt)}</td>
                  <td>{version.modifiePar || 'Système'}</td>
                  <td className={styles.reason}>
                    {version.raisonModification || '-'}
                    {version.commentaire && (
                      <span className={styles.comment} title={version.commentaire}>
                        ℹ️
                      </span>
                    )}
                  </td>
                  <td>
                    {champsModifies.length > 0 ? (
                      <span className={styles.fieldsModified}>
                        {champsModifies.join(', ')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {!estVersionActuelle && (
                      <button
                        onClick={() => handleRestaurer(version.numeroVersion)}
                        className={styles.restoreButton}
                        disabled={loading}
                      >
                        Restaurer
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
