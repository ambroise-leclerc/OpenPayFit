import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanies,
  getEmployees,
  getExpenseReports,
  createExpenseReport,
  updateExpenseReport,
  deleteExpenseReport,
  type Company,
  type Employee,
  type ExpenseReport,
  type CreateExpenseReportData,
  type ExpenseCategory,
} from '../services/api';

function ExpensesPage() {
  const { token, logout } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour le formulaire de création
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    items: [
      {
        category: 'TRANSPORT' as ExpenseCategory,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
      },
    ],
  });

  // Charger les entreprises au montage
  useEffect(() => {
    if (token) {
      loadCompanies();
    }
  }, [token]);

  // Charger les employés et rapports quand une entreprise est sélectionnée
  useEffect(() => {
    if (selectedCompanyId && token) {
      loadEmployees(selectedCompanyId);
      loadReports(selectedCompanyId);
    }
  }, [selectedCompanyId, token]);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCompanies(token!);
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        logout();
      } else {
        setError(err.message || 'Erreur lors du chargement des entreprises');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees(companyId: string) {
    try {
      const data = await getEmployees(companyId, token!);
      setEmployees(data);
      if (data.length > 0 && !formData.employeeId) {
        setFormData({ ...formData, employeeId: data[0].id });
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des employés');
    }
  }

  async function loadReports(companyId: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getExpenseReports(companyId, {}, token!);
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          category: 'TRANSPORT' as ExpenseCategory,
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          description: '',
        },
      ],
    });
  }

  function removeItem(index: number) {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      setError(null);

      const reportData: CreateExpenseReportData = {
        employeeId: formData.employeeId,
        title: formData.title,
        items: formData.items.map(item => ({
          ...item,
          amount: parseFloat(item.amount.toString()),
        })),
      };

      await createExpenseReport(selectedCompanyId, reportData, token!);

      // Réinitialiser le formulaire
      setFormData({
        employeeId: employees.length > 0 ? employees[0].id : '',
        title: '',
        items: [
          {
            category: 'TRANSPORT' as ExpenseCategory,
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            description: '',
          },
        ],
      });
      setShowForm(false);

      // Recharger les rapports
      await loadReports(selectedCompanyId);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du rapport');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId: string, newStatus: string) {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      setError(null);
      await updateExpenseReport(
        selectedCompanyId,
        reportId,
        { status: newStatus as any },
        token!
      );
      await loadReports(selectedCompanyId);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reportId: string) {
    if (!selectedCompanyId || !confirm('Voulez-vous vraiment supprimer ce rapport ?')) return;

    try {
      setLoading(true);
      setError(null);
      await deleteExpenseReport(selectedCompanyId, reportId, token!);
      await loadReports(selectedCompanyId);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du rapport');
    } finally {
      setLoading(false);
    }
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
    PAID: 'Remboursé',
  };

  const categoryLabels: Record<string, string> = {
    TRANSPORT: 'Transport',
    MEAL: 'Repas',
    ACCOMMODATION: 'Hébergement',
    EQUIPMENT: 'Équipement',
    OTHER: 'Autre',
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestion des Notes de Frais</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', border: '1px solid red' }}>
          {error}
        </div>
      )}

      {/* Sélection de l'entreprise */}
      {companies.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label>
            <strong>Entreprise :</strong>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Bouton pour afficher le formulaire */}
      {!showForm && employees.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          Créer un nouveau rapport
        </button>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
          <h2>Nouveau Rapport de Notes de Frais</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Employé :</strong>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                <strong>Titre :</strong>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Déplacement Paris - Novembre 2025"
                  style={{ marginLeft: '10px', padding: '5px', width: '400px' }}
                />
              </label>
            </div>

            <h3>Dépenses</h3>
            {formData.items.map((item, index) => (
              <div key={index} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: '10px' }}>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    required
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    required
                    placeholder="Montant"
                  />

                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateItem(index, 'date', e.target.value)}
                    required
                  />

                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required
                    placeholder="Description"
                  />

                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      style={{ backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              style={{ marginRight: '10px', padding: '5px 10px' }}
            >
              + Ajouter une dépense
            </button>

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginRight: '10px',
                }}
              >
                {loading ? 'Création...' : 'Créer le rapport'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des rapports */}
      <h2>Rapports de Notes de Frais</h2>
      {loading && !showForm ? (
        <p>Chargement...</p>
      ) : reports.length === 0 ? (
        <p>Aucun rapport de notes de frais pour le moment.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Titre</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Employé</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Montant Total</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Statut</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{report.title}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {report.employee
                    ? `${report.employee.firstName} ${report.employee.lastName}`
                    : 'N/A'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {report.totalAmount.toFixed(2)} €
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <select
                    value={report.status}
                    onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                    style={{ padding: '5px' }}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                  <button
                    onClick={() => handleDelete(report.id)}
                    style={{
                      backgroundColor: 'red',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ExpensesPage;
