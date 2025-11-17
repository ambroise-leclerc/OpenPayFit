import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../services/api';
import type { Company, Employee } from '../services/api';

// Mock the api module
vi.mock('../services/api');

const mockCompanies: Company[] = [
  { id: '1', name: 'Company A', ownerId: 'user1', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Company B', ownerId: 'user1', createdAt: '', updatedAt: '' },
];

const mockEmployees: Employee[] = [
  { id: '101', firstName: 'Alice', lastName: 'Smith', email: 'alice@companya.com', grossSalary: 50000, companyId: '1', createdAt: '', updatedAt: '' },
  { id: '102', firstName: 'Bob', lastName: 'Johnson', email: 'bob@companya.com', grossSalary: 60000, companyId: '1', createdAt: '', updatedAt: '' },
];

describe('DashboardPage', () => {
  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={{ token: 'fake-token', login: vi.fn(), logout: vi.fn() }}>
        {ui}
      </AuthContext.Provider>
    );
  };

  it('should display companies and employees correctly', async () => {
    // Setup mocks
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);
    vi.mocked(api.getEmployees).mockResolvedValue(mockEmployees);
    vi.mocked(api.getLeaves).mockResolvedValue([]);
    vi.mocked(api.getLeaveBalances).mockResolvedValue([]);

    renderWithAuth(<DashboardPage />);

    // 1. Check for loading state initially (optional, but good practice)
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();

    // 2. Wait for companies to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText('Company A')).toBeInTheDocument();
      expect(screen.getByText('Company B')).toBeInTheDocument();
    });

    // 3. Default selection should trigger employee fetch
    await waitFor(() => {
      // Names are in different cells, so we query for them separately
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Johnson')).toBeInTheDocument();
    });

    // 4. Simulate user selecting another company (let's pretend it has no employees)
    vi.mocked(api.getEmployees).mockResolvedValue([]); // Mock response for the second company
    // Use getAllByRole to get the first combobox (company selector)
    const [companySelect] = screen.getAllByRole('combobox');
    fireEvent.change(companySelect, { target: { value: '2' } });

    await waitFor(() => {
        expect(screen.getByText(/Cette entreprise n'a pas encore d'employé./i)).toBeInTheDocument();
    });

  });
});
