import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanies,
  getEmployees,
  getLeaves,
  getLeaveBalances,
  createLeave,
  updateLeave,
  deleteLeave,
} from '../services/api';
import type { Company, Employee, Leave, LeaveBalance, CreateLeaveData } from '../services/api';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import LeaveList from '../components/LeaveList';
import LeaveRequestForm from '../components/LeaveRequestForm';

export default function DashboardPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

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

  useEffect(() => {
    if (token && selectedCompany) {
      const fetchEmployees = async () => {
        try {
          const fetchedEmployees = await getEmployees(selectedCompany.id, token);
          setEmployees(fetchedEmployees);
          if (fetchedEmployees.length > 0) {
            setSelectedEmployee(fetchedEmployees[0]);
          } else {
            setSelectedEmployee(null);
          }
          setError(null);
        } catch (err) {
          setError((err as Error).message);
        }
      };
      fetchEmployees();
    } else {
      setEmployees([]);
      setSelectedEmployee(null);
    }
  }, [token, selectedCompany]);

  // Récupérer les demandes de congés et les soldes quand un employé est sélectionné
  useEffect(() => {
    if (token && selectedCompany && selectedEmployee) {
      const fetchLeaveData = async () => {
        try {
          const [fetchedLeaves, fetchedBalances] = await Promise.all([
            getLeaves(selectedCompany.id, selectedEmployee.id, token),
            getLeaveBalances(selectedCompany.id, selectedEmployee.id, token),
          ]);
          setLeaves(fetchedLeaves);
          setLeaveBalances(fetchedBalances);
          setError(null);
        } catch (err) {
          setError((err as Error).message);
        }
      };
      fetchLeaveData();
    } else {
      setLeaves([]);
      setLeaveBalances([]);
    }
  }, [token, selectedCompany, selectedEmployee]);

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = event.target.value;
    const company = companies.find((c) => c.id === companyId) || null;
    setSelectedCompany(company);
  };

  const handleEmployeeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = event.target.value;
    const employee = employees.find((e) => e.id === employeeId) || null;
    setSelectedEmployee(employee);
  };

  // Gérer la soumission d'une nouvelle demande de congé
  const handleLeaveSubmit = async (leaveData: CreateLeaveData) => {
    if (!token || !selectedCompany || !selectedEmployee) return;

    try {
      await createLeave(selectedCompany.id, selectedEmployee.id, leaveData, token);
      // Rafraîchir les données
      const [fetchedLeaves, fetchedBalances] = await Promise.all([
        getLeaves(selectedCompany.id, selectedEmployee.id, token),
        getLeaveBalances(selectedCompany.id, selectedEmployee.id, token),
      ]);
      setLeaves(fetchedLeaves);
      setLeaveBalances(fetchedBalances);
      setShowLeaveForm(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Approuver une demande de congé
  const handleApproveLeave = async (leaveId: string) => {
    if (!token || !selectedCompany || !selectedEmployee) return;

    try {
      await updateLeave(selectedCompany.id, selectedEmployee.id, leaveId, { status: 'APPROVED' }, token);
      // Rafraîchir les données
      const [fetchedLeaves, fetchedBalances] = await Promise.all([
        getLeaves(selectedCompany.id, selectedEmployee.id, token),
        getLeaveBalances(selectedCompany.id, selectedEmployee.id, token),
      ]);
      setLeaves(fetchedLeaves);
      setLeaveBalances(fetchedBalances);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Rejeter une demande de congé
  const handleRejectLeave = async (leaveId: string) => {
    if (!token || !selectedCompany || !selectedEmployee) return;

    try {
      await updateLeave(selectedCompany.id, selectedEmployee.id, leaveId, { status: 'REJECTED' }, token);
      // Rafraîchir les données
      const fetchedLeaves = await getLeaves(selectedCompany.id, selectedEmployee.id, token);
      setLeaves(fetchedLeaves);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Supprimer une demande de congé
  const handleDeleteLeave = async (leaveId: string) => {
    if (!token || !selectedCompany || !selectedEmployee) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande de congé ?')) return;

    try {
      await deleteLeave(selectedCompany.id, selectedEmployee.id, leaveId, token);
      // Rafraîchir les données
      const [fetchedLeaves, fetchedBalances] = await Promise.all([
        getLeaves(selectedCompany.id, selectedEmployee.id, token),
        getLeaveBalances(selectedCompany.id, selectedEmployee.id, token),
      ]);
      setLeaves(fetchedLeaves);
      setLeaveBalances(fetchedBalances);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error && !loading) {
    return <div style={{ color: 'red' }}>Erreur : {error}</div>;
  }

  return (
    <div>
      <h1>Tableau de Bord</h1>

      <section>
        <h2>Mes Entreprises</h2>
        {companies.length > 0 ? (
          <select onChange={handleCompanyChange} value={selectedCompany?.id || ''}>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        ) : (
          // TODO: Ajouter un bouton/formulaire "Créer une entreprise"
          <p>Vous n'avez pas encore d'entreprise. Créez-en une !</p>
        )}
      </section>

      <hr />

      <section>
        {selectedCompany ? (
          <div>
            <h2>Employés de {selectedCompany.name}</h2>
            <EmployeeList employees={employees} />
            <hr />
            <EmployeeForm />
          </div>
        ) : (
          companies.length > 0 && <p>Sélectionnez une entreprise pour voir ses employés.</p>
        )}
      </section>

      <hr />

      {/* Section de gestion des congés */}
      <section>
        <h2>Gestion des congés</h2>
        {selectedCompany && employees.length > 0 ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="employee-select">Sélectionner un employé : </label>
              <select
                id="employee-select"
                onChange={handleEmployeeChange}
                value={selectedEmployee?.id || ''}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div>
                <h3>
                  Congés de {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>

                {/* Afficher le formulaire de demande de congé */}
                {showLeaveForm ? (
                  <LeaveRequestForm
                    onSubmit={handleLeaveSubmit}
                    onCancel={() => setShowLeaveForm(false)}
                  />
                ) : (
                  <button onClick={() => setShowLeaveForm(true)} style={{ marginBottom: '20px' }}>
                    Nouvelle demande de congé
                  </button>
                )}

                {/* Afficher la liste des demandes de congés et les soldes */}
                <LeaveList
                  leaves={leaves}
                  balances={leaveBalances}
                  onApprove={handleApproveLeave}
                  onReject={handleRejectLeave}
                  onDelete={handleDeleteLeave}
                />
              </div>
            )}
          </div>
        ) : (
          <p>
            {selectedCompany
              ? 'Aucun employé dans cette entreprise. Ajoutez-en un pour gérer les congés.'
              : 'Sélectionnez une entreprise pour gérer les congés.'}
          </p>
        )}
      </section>
    </div>
  );
}