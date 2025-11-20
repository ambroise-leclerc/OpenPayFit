/**
 * Page de gestion des DSN (Déclarations Sociales Nominatives)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanies,
  getDSNDeclarations,
  generateDSN,
  downloadDSN,
  deleteDSN,
  transmettreDSN,
  getTransmissionStatus,
  getNetEntreprisesConfig,
} from '../services/api';
import type {
  Company,
  DSNDeclaration,
  GenerateDSNResult,
  TransmissionDSN,
  ConfigurationNetEntreprises,
} from '../services/api';

export default function DSNPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [declarations, setDeclarations] = useState<DSNDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [periode, setPeriode] = useState('');
  const [transmitting, setTransmitting] = useState<string | null>(null);
  // Stocke les statuts de transmission pour affichage futur dans l'UI
  const [_transmissions, setTransmissions] = useState<Record<string, TransmissionDSN | null>>({});
  const [config, setConfig] = useState<ConfigurationNetEntreprises | null>(null);

  // Charger les entreprises au montage
  useEffect(() => {
    if (token) {
      const fetchCompanies = async () => {
        try {
          setLoading(true);
          const fetchedCompanies = await getCompanies(token);
          setCompanies(fetchedCompanies);
          if (fetchedCompanies.length > 0) {
            setSelectedCompany(fetchedCompanies[0]);
          }
          setError(null);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      };
      fetchCompanies();
    }
  }, [token]);

  // Charger les DSN quand une entreprise est sélectionnée
  useEffect(() => {
    if (token && selectedCompany) {
      const fetchDSN = async () => {
        try {
          const fetchedDeclarations = await getDSNDeclarations(selectedCompany.id, token);
          setDeclarations(fetchedDeclarations);
          setError(null);
        } catch (err) {
          setError((err as Error).message);
        }
      };
      fetchDSN();

      // Charger la configuration Net-Entreprises
      const fetchConfig = async () => {
        try {
          const fetchedConfig = await getNetEntreprisesConfig(selectedCompany.id, token);
          setConfig(fetchedConfig);
        } catch (err) {
          // Configuration non trouvée, c'est normal si pas encore configurée
          setConfig(null);
        }
      };
      fetchConfig();
    } else {
      setDeclarations([]);
      setConfig(null);
    }
  }, [token, selectedCompany]);

  // Initialiser la période par défaut (mois précédent)
  useEffect(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const formattedPeriode = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    setPeriode(formattedPeriode);
  }, []);

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = event.target.value;
    const company = companies.find((c) => c.id === companyId) || null;
    setSelectedCompany(company);
  };

  const handleGenerateDSN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !token || !periode) return;

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result: GenerateDSNResult = await generateDSN(selectedCompany.id, { periode }, token);

      if (result.validation.valide) {
        setSuccess(`DSN générée avec succès pour ${periode}`);
      } else {
        const erreurs = result.validation.messages.filter(m => m.type === 'ERREUR');
        if (erreurs.length > 0) {
          setError(`Erreurs de validation : ${erreurs.map(e => e.message).join(', ')}`);
        } else {
          setSuccess(`DSN générée avec des avertissements pour ${periode}`);
        }
      }

      // Recharger la liste des DSN
      const fetchedDeclarations = await getDSNDeclarations(selectedCompany.id, token);
      setDeclarations(fetchedDeclarations);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (dsnId: string) => {
    if (!selectedCompany || !token) return;

    try {
      setError(null);
      await downloadDSN(selectedCompany.id, dsnId, token);
      setSuccess('DSN téléchargée avec succès');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (dsnId: string) => {
    if (!selectedCompany || !token) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette DSN ?')) return;

    try {
      setError(null);
      await deleteDSN(selectedCompany.id, dsnId, token);
      setSuccess('DSN supprimée avec succès');

      // Recharger la liste
      const fetchedDeclarations = await getDSNDeclarations(selectedCompany.id, token);
      setDeclarations(fetchedDeclarations);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleTransmit = async (dsnId: string) => {
    if (!selectedCompany || !token) return;

    // Vérifier que la configuration est active
    if (!config || !config.estActif) {
      setError('La transmission automatique n\'est pas configurée ou activée. Veuillez configurer Net-Entreprises d\'abord.');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir transmettre cette DSN vers net-entreprises.fr ?')) return;

    setTransmitting(dsnId);
    setError(null);
    setSuccess(null);

    try {
      const result = await transmettreDSN(selectedCompany.id, dsnId, token);
      setSuccess(result.message);

      // Recharger la liste des DSN
      const fetchedDeclarations = await getDSNDeclarations(selectedCompany.id, token);
      setDeclarations(fetchedDeclarations);

      // Charger le statut de transmission
      try {
        const status = await getTransmissionStatus(selectedCompany.id, dsnId, token);
        setTransmissions(prev => ({ ...prev, [dsnId]: status.derniere }));
      } catch (err) {
        // Ignore
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTransmitting(null);
    }
  };

  const handleViewTransmission = async (dsnId: string) => {
    if (!selectedCompany || !token) return;

    try {
      const status = await getTransmissionStatus(selectedCompany.id, dsnId, token);
      setTransmissions(prev => ({ ...prev, [dsnId]: status.derniere }));
      alert(`Statut de transmission : ${status.derniere.statut}\nNombre de tentatives : ${status.derniere.nombreTentatives}\n${status.derniere.derniereErreur ? 'Erreur : ' + status.derniere.derniereErreur : ''}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatPeriode = (periode: string) => {
    const [annee, mois] = periode.split('-');
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${moisNoms[parseInt(mois) - 1]} ${annee}`;
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'VALIDEE': return 'badge-success';
      case 'TRANSMISE': return 'badge-info';
      case 'ERREUR': return 'badge-error';
      default: return 'badge-warning';
    }
  };

  if (loading) {
    return <div className="container">Chargement...</div>;
  }

  return (
    <div className="container">
      <h1>Déclarations Sociales Nominatives (DSN)</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Sélection de l'entreprise */}
      <div className="form-group">
        <label htmlFor="companySelect">Entreprise :</label>
        <select
          id="companySelect"
          value={selectedCompany?.id || ''}
          onChange={handleCompanyChange}
          className="form-control"
        >
          <option value="">Sélectionnez une entreprise</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCompany && (
        <>
          {/* Configuration Net-Entreprises */}
          {!config || !config.estActif ? (
            <div className="alert alert-info">
              <strong>Transmission automatique DSN :</strong> La transmission automatique vers net-entreprises.fr n'est pas configurée.
              Les DSN doivent être téléchargées et transmises manuellement via net-entreprises.fr.
              <br />
              <em>(Configuration automatique disponible dans une version ultérieure)</em>
            </div>
          ) : (
            <div className="alert alert-success">
              <strong>Transmission automatique active :</strong> Configuration Net-Entreprises activée
              (SIRET : {config.siretDeclarant}, Mode : {config.modeTest ? 'Test' : 'Production'})
            </div>
          )}

          {/* Formulaire de génération */}
          <div className="card">
            <div className="card-header">
              <h2>Générer une nouvelle DSN</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleGenerateDSN}>
                <div className="form-group">
                  <label htmlFor="periode">Période de paie (AAAA-MM) :</label>
                  <input
                    type="month"
                    id="periode"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    required
                    className="form-control"
                  />
                  <small className="form-text">
                    Format : année-mois (ex: {new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')})
                  </small>
                </div>
                <button type="submit" disabled={generating} className="btn btn-primary">
                  {generating ? 'Génération en cours...' : 'Générer la DSN'}
                </button>
              </form>
            </div>
          </div>

          {/* Liste des DSN */}
          <div className="card">
            <div className="card-header">
              <h2>Déclarations DSN ({declarations.length})</h2>
            </div>
            <div className="card-body">
              {declarations.length === 0 ? (
                <p className="text-muted">Aucune DSN générée pour cette entreprise.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Période</th>
                      <th>N° Déclaration</th>
                      <th>Statut</th>
                      <th>Date de génération</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.map((dsn) => (
                      <tr key={dsn.id}>
                        <td>{formatPeriode(dsn.periodeDeclaration)}</td>
                        <td>{dsn.numeroDeclaration || '-'}</td>
                        <td>
                          <span className={`badge ${getStatutBadgeClass(dsn.statut)}`}>
                            {dsn.statut}
                          </span>
                        </td>
                        <td>
                          {dsn.dateGeneration
                            ? new Date(dsn.dateGeneration).toLocaleDateString('fr-FR')
                            : '-'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDownload(dsn.id)}
                            className="btn btn-sm btn-secondary"
                            title="Télécharger le fichier XML"
                          >
                            Télécharger
                          </button>
                          {dsn.statut === 'VALIDEE' && config?.estActif && (
                            <button
                              onClick={() => handleTransmit(dsn.id)}
                              disabled={transmitting === dsn.id}
                              className="btn btn-sm btn-primary"
                              style={{ marginLeft: '8px' }}
                              title="Transmettre automatiquement vers net-entreprises.fr"
                            >
                              {transmitting === dsn.id ? 'Transmission...' : 'Transmettre'}
                            </button>
                          )}
                          {dsn.statut === 'TRANSMISE' && (
                            <button
                              onClick={() => handleViewTransmission(dsn.id)}
                              className="btn btn-sm btn-info"
                              style={{ marginLeft: '8px' }}
                              title="Voir le statut de transmission"
                            >
                              Statut
                            </button>
                          )}
                          {dsn.statut === 'BROUILLON' && (
                            <button
                              onClick={() => handleDelete(dsn.id)}
                              className="btn btn-sm btn-danger"
                              style={{ marginLeft: '8px' }}
                              title="Supprimer cette DSN"
                            >
                              Supprimer
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
        </>
      )}

      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        h1 {
          margin-bottom: 30px;
          color: #333;
        }

        h2 {
          font-size: 1.5rem;
          margin: 0;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background-color: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .alert-info {
          background-color: #e7f3ff;
          border: 1px solid #b8daff;
          color: #004085;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }

        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-text {
          display: block;
          margin-top: 4px;
          color: #888;
          font-size: 0.875rem;
        }

        .card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          background-color: #f9f9f9;
        }

        .card-body {
          padding: 20px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th,
        .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .table th {
          background-color: #f9f9f9;
          font-weight: 600;
          color: #555;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .badge-success {
          background-color: #d4edda;
          color: #155724;
        }

        .badge-info {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .badge-warning {
          background-color: #fff3cd;
          color: #856404;
        }

        .badge-error {
          background-color: #f8d7da;
          color: #721c24;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-info {
          background-color: #17a2b8;
          color: white;
        }

        .btn-info:hover {
          background-color: #138496;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.875rem;
        }

        .text-muted {
          color: #6c757d;
        }
      `}</style>
    </div>
  );
}
