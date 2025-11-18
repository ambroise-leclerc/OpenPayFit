/**
 * Page de gestion des organismes collecteurs de cotisations sociales
 *
 * Fonctionnalités :
 * - Affichage de tous les organismes (globaux + spécifiques aux entreprises)
 * - Création d'organismes spécifiques à une entreprise
 * - Modification d'organismes spécifiques (les globaux ne sont pas modifiables)
 * - Suppression d'organismes spécifiques (les globaux ne peuvent pas être supprimés)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import type {
  OrganismeCotisation,
  CreateOrganismData,
  UpdateOrganismData,
  Company,
  TypeOrganisme,
} from '../services/api';

type FormMode = 'create' | 'edit' | null;

interface OrganismFormData {
  code: string;
  nom: string;
  typeOrganisme: TypeOrganisme;
  description: string;
  compagnieId: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siteWeb: string;
  numeroSiret: string;
}

const initialFormData: OrganismFormData = {
  code: '',
  nom: '',
  typeOrganisme: 'AUTRE',
  description: '',
  compagnieId: '',
  adresse: '',
  codePostal: '',
  ville: '',
  telephone: '',
  email: '',
  siteWeb: '',
  numeroSiret: '',
};

function OrganismsPage() {
  const { token } = useAuth();
  const [organisms, setOrganisms] = useState<OrganismeCotisation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // État du formulaire
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formData, setFormData] = useState<OrganismFormData>(initialFormData);
  const [editingOrganism, setEditingOrganism] = useState<OrganismeCotisation | null>(null);

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [organismsData, companiesData] = await Promise.all([
        api.getAllOrganisms(token),
        api.getCompanies(token),
      ]);

      setOrganisms(organismsData);
      setCompanies(companiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setFormData(initialFormData);
    setEditingOrganism(null);
    setFormMode('create');
    setError(null);
    setSuccess(null);
  };

  const handleOpenEditForm = (organism: OrganismeCotisation) => {
    if (organism.estGlobal) {
      setError('Les organismes globaux (obligatoires) ne peuvent pas être modifiés');
      return;
    }

    setFormData({
      code: organism.code,
      nom: organism.nom,
      typeOrganisme: organism.typeOrganisme,
      description: organism.description || '',
      compagnieId: organism.compagnieId || '',
      adresse: organism.adresse || '',
      codePostal: organism.codePostal || '',
      ville: organism.ville || '',
      telephone: organism.telephone || '',
      email: organism.email || '',
      siteWeb: organism.siteWeb || '',
      numeroSiret: organism.numeroSiret || '',
    });
    setEditingOrganism(organism);
    setFormMode('edit');
    setError(null);
    setSuccess(null);
  };

  const handleCloseForm = () => {
    setFormMode(null);
    setFormData(initialFormData);
    setEditingOrganism(null);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      if (formMode === 'create') {
        // Créer un nouvel organisme
        const createData: CreateOrganismData = {
          code: formData.code.trim(),
          nom: formData.nom.trim(),
          typeOrganisme: formData.typeOrganisme,
          description: formData.description.trim() || undefined,
          compagnieId: formData.compagnieId,
          adresse: formData.adresse.trim() || undefined,
          codePostal: formData.codePostal.trim() || undefined,
          ville: formData.ville.trim() || undefined,
          telephone: formData.telephone.trim() || undefined,
          email: formData.email.trim() || undefined,
          siteWeb: formData.siteWeb.trim() || undefined,
          numeroSiret: formData.numeroSiret.trim() || undefined,
        };

        await api.createOrganism(createData, token);
        setSuccess('Organisme créé avec succès');
      } else if (formMode === 'edit' && editingOrganism) {
        // Mettre à jour un organisme existant
        const updateData: UpdateOrganismData = {
          nom: formData.nom.trim(),
          typeOrganisme: formData.typeOrganisme,
          description: formData.description.trim() || undefined,
          adresse: formData.adresse.trim() || undefined,
          codePostal: formData.codePostal.trim() || undefined,
          ville: formData.ville.trim() || undefined,
          telephone: formData.telephone.trim() || undefined,
          email: formData.email.trim() || undefined,
          siteWeb: formData.siteWeb.trim() || undefined,
          numeroSiret: formData.numeroSiret.trim() || undefined,
        };

        await api.updateOrganism(editingOrganism.id, updateData, token);
        setSuccess('Organisme mis à jour avec succès');
      }

      await loadData();
      handleCloseForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (organism: OrganismeCotisation) => {
    if (organism.estGlobal) {
      setError('Les organismes globaux (obligatoires) ne peuvent pas être supprimés');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'organisme "${organism.nom}" ?`)) {
      return;
    }

    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      await api.deleteOrganism(organism.id, token);
      setSuccess('Organisme supprimé avec succès');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const getTypeOrganismeLabel = (type: TypeOrganisme): string => {
    const labels: Record<TypeOrganisme, string> = {
      URSSAF: 'URSSAF',
      RETRAITE: 'Retraite complémentaire',
      CHOMAGE: 'Chômage',
      PREVOYANCE: 'Prévoyance',
      MUTUELLE: 'Mutuelle',
      FORMATION: 'Formation (OPCO)',
      AUTRE: 'Autre',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Organismes Collecteurs</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Organismes Collecteurs de Cotisations Sociales</h1>
        <button onClick={handleOpenCreateForm} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
          + Ajouter un organisme
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#efe', border: '1px solid #cfc', borderRadius: '4px' }}>
          <strong>Succès :</strong> {success}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2>Organismes Globaux (Obligatoires)</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Ces organismes sont obligatoires pour toutes les entreprises et ne peuvent pas être modifiés ou supprimés.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Nom</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {organisms.filter((o) => o.estGlobal).map((organism) => (
              <tr key={organism.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>
                  <code>{organism.code}</code>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <strong>{organism.nom}</strong>
                  {organism.description && (
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                      {organism.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.75rem' }}>{getTypeOrganismeLabel(organism.typeOrganisme)}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                  {organism.telephone && <div>📞 {organism.telephone}</div>}
                  {organism.siteWeb && (
                    <div>
                      <a href={organism.siteWeb} target="_blank" rel="noopener noreferrer">
                        🌐 Site web
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Organismes Spécifiques aux Entreprises</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Organismes spécifiques à vos entreprises (caisses de retraite de branche, mutuelles obligatoires, etc.).
        </p>
        {organisms.filter((o) => !o.estGlobal).length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', border: '1px dashed #ddd', borderRadius: '4px' }}>
            Aucun organisme spécifique. Cliquez sur "Ajouter un organisme" pour en créer un.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Code</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Nom</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Entreprise</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Contact</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organisms.filter((o) => !o.estGlobal).map((organism) => (
                <tr key={organism.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <code>{organism.code}</code>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>{organism.nom}</strong>
                    {organism.description && (
                      <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                        {organism.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{getTypeOrganismeLabel(organism.typeOrganisme)}</td>
                  <td style={{ padding: '0.75rem' }}>{organism.compagnie?.nom || '—'}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {organism.telephone && <div>📞 {organism.telephone}</div>}
                    {organism.email && <div>✉️ {organism.email}</div>}
                    {organism.siteWeb && (
                      <div>
                        <a href={organism.siteWeb} target="_blank" rel="noopener noreferrer">
                          🌐 Site web
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenEditForm(organism)}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem' }}
                      title="Modifier"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(organism)}
                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f44', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      title="Supprimer"
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de formulaire */}
      {formMode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseForm}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{formMode === 'create' ? 'Ajouter un organisme' : 'Modifier un organisme'}</h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  disabled={formMode === 'edit'}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Ex: AG2R, MALAKOFF, PRO_BTP"
                />
                <small style={{ color: '#666' }}>Code unique de l'organisme (ne peut pas être modifié)</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Nom *
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Ex: AG2R LA MONDIALE"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Type *
                </label>
                <select
                  name="typeOrganisme"
                  value={formData.typeOrganisme}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="URSSAF">URSSAF</option>
                  <option value="RETRAITE">Retraite complémentaire</option>
                  <option value="CHOMAGE">Chômage</option>
                  <option value="PREVOYANCE">Prévoyance</option>
                  <option value="MUTUELLE">Mutuelle</option>
                  <option value="FORMATION">Formation (OPCO)</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Entreprise *
                </label>
                <select
                  name="compagnieId"
                  value={formData.compagnieId}
                  onChange={handleInputChange}
                  required
                  disabled={formMode === 'edit'}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">-- Sélectionnez une entreprise --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#666' }}>Entreprise à laquelle cet organisme est rattaché</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Description de l'organisme"
                />
              </div>

              <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Informations de contact (optionnel)</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="contact@organisme.fr"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Numéro et nom de rue"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Code postal</label>
                  <input
                    type="text"
                    name="codePostal"
                    value={formData.codePostal}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="75001"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ville</label>
                  <input
                    type="text"
                    name="ville"
                    value={formData.ville}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Site web</label>
                  <input
                    type="url"
                    name="siteWeb"
                    value={formData.siteWeb}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="https://www.exemple.fr"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Numéro SIRET</label>
                  <input
                    type="text"
                    name="numeroSiret"
                    value={formData.numeroSiret}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    placeholder="12345678901234"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {formMode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganismsPage;
