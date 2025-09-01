import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEmployeePayslips, downloadPayslipPDF } from '../services/api';

// Define the Payslip interface based on the Prisma model
interface Payslip {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  grossSalary: number;
  netSalary: number;
  totalContributions: number;
  normalHoursWorked: number;
  overtimeHoursWorked: number;
  employeeId: string;
  createdAt: string;
  updatedAt: string;
}

const EmployeePayslipsPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayslips = async () => {
      if (!employeeId) return;
      try {
        setLoading(true);
        const data = await getEmployeePayslips(employeeId);
        setPayslips(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch payslips');
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [employeeId]);

  const handleDownload = async (payslipId: string) => {
    try {
      const blob = await downloadPayslipPDF(payslipId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Payslips for Employee</h2>
      {payslips.length === 0 ? (
        <p>No payslips found for this employee.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Gross Salary</th>
              <th>Net Salary</th>
              <th>Contributions</th>
              <th>Normal Hours</th>
              <th>Overtime Hours</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map(p => (
              <tr key={p.id}>
                <td>{new Date(p.periodStartDate).toLocaleDateString()} - {new Date(p.periodEndDate).toLocaleDateString()}</td>
                <td>{p.grossSalary.toFixed(2)} €</td>
                <td>{p.netSalary.toFixed(2)} €</td>
                <td>{p.totalContributions.toFixed(2)} €</td>
                <td>{p.normalHoursWorked}</td>
                <td>{p.overtimeHoursWorked}</td>
                <td>
                  <button className="btn btn-primary" onClick={() => handleDownload(p.id)}>
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeePayslipsPage;