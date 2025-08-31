import React, { useState, useEffect } from 'react';
import { getCompanies, getEmployeesForCompany, runPayroll } from '../services/api';

const PayrollPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [hours, setHours] = useState<{ [key: string]: { normalHours: number; overtimeHours: number } }>({});
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (err) {
        setError('Failed to fetch companies');
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      const fetchEmployees = async () => {
        try {
          const data = await getEmployeesForCompany(selectedCompany);
          setEmployees(data);
          // Initialize hours
          const initialHours = data.reduce((acc: any, emp: any) => {
            acc[emp.id] = { normalHours: 151.67, overtimeHours: 0 };
            return acc;
          }, {});
          setHours(initialHours);
        } catch (err) {
          setError('Failed to fetch employees');
        }
      };
      fetchEmployees();
    }
  }, [selectedCompany]);

  const handleHourChange = (employeeId: string, type: 'normalHours' | 'overtimeHours', value: string) => {
    setHours(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [type]: parseFloat(value) || 0,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payrollData = { companyId: selectedCompany, month, year, hours };
      const data = await runPayroll(payrollData);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Run Payroll</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="company" className="form-label">Company</label>
          <select
            id="company"
            className="form-select"
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            required
          >
            <option value="" disabled>Select a company</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedCompany && (
          <>
            <div className="row mb-3">
              <div className="col">
                <label htmlFor="month" className="form-label">Month</label>
                <input
                  type="number"
                  id="month"
                  className="form-control"
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value, 10))}
                  min="1"
                  max="12"
                  required
                />
              </div>
              <div className="col">
                <label htmlFor="year" className="form-label">Year</label>
                <input
                  type="number"
                  id="year"
                  className="form-control"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value, 10))}
                  required
                />
              </div>
            </div>

            <h4>Employee Hours</h4>
            {employees.map(emp => (
              <div key={emp.id} className="row mb-2 align-items-center">
                <div className="col-md-4">{emp.firstName} {emp.lastName}</div>
                <div className="col-md-4">
                  <label htmlFor={`normal-${emp.id}`} className="form-label small">Normal Hours</label>
                  <input
                    type="number"
                    id={`normal-${emp.id}`}
                    className="form-control"
                    value={hours[emp.id]?.normalHours || ''}
                    onChange={e => handleHourChange(emp.id, 'normalHours', e.target.value)}
                    step="0.01"
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor={`overtime-${emp.id}`} className="form-label small">Overtime Hours</label>
                  <input
                    type="number"
                    id={`overtime-${emp.id}`}
                    className="form-control"
                    value={hours[emp.id]?.overtimeHours || ''}
                    onChange={e => handleHourChange(emp.id, 'overtimeHours', e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>
            ))}

            <button type="submit" className="btn btn-primary mt-3" disabled={loading}>
              {loading ? 'Running...' : 'Run Payroll'}
            </button>
          </>
        )}
      </form>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {result && (
        <div className="alert alert-success mt-3">
          <p>{result.message}</p>
          <ul>
            {result.payslips.map((p: any) => (
              <li key={p.id}>
                Employee {p.employeeId}: Gross ${p.grossSalary.toFixed(2)}, Net ${p.netSalary.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
