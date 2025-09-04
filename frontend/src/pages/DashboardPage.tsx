import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCompanies, getEmployees } from '../services/api';
import type { Company, Employee } from '../services/api';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';

export default function DashboardPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const fetchedCompanies = await getCompanies(token);
      setCompanies(fetchedCompanies);
      if (fetchedCompanies.length > 0 && !selectedCompany) {
        setSelectedCompany(fetchedCompanies[0]);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCompany]);

  const fetchEmployees = useCallback(async () => {
    if (!token || !selectedCompany) {
      setEmployees([]);
      return;
    }
    try {
      const fetchedEmployees = await getEmployees(selectedCompany.id, token);
      setEmployees(fetchedEmployees);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, selectedCompany]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = event.target.value;
    const company = companies.find((c) => c.id === companyId) || null;
    setSelectedCompany(company);
  };

  if (loading && companies.length === 0) {
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
          <div>
            <p>Vous n'avez pas encore d'entreprise. Créez-en une !</p>
            <Link to="/company/new">
              <button>Créer une entreprise</button>
            </Link>
          </div>
        )}
      </section>

      <hr />

      <section>
        {selectedCompany ? (
          <div>
            <h2>Employés de {selectedCompany.name}</h2>
            <EmployeeList employees={employees} />
            <hr />
            <EmployeeForm
              companyId={selectedCompany.id}
              onEmployeeCreated={fetchEmployees}
            />
          </div>
        ) : (
          companies.length > 0 && <p>Sélectionnez une entreprise pour voir ses employés.</p>
        )}
      </section>
    </div>
  );
}
