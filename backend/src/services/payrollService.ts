import { Employee } from '../generated/prisma';

const OVERTIME_RATE = 1.25; // Majoration de 25% pour les heures supplémentaires
const SOCIAL_CONTRIBUTIONS_RATE = 0.25; // 25% de cotisations sociales

interface PayrollInput {
  employee: Employee;
  normalHoursWorked: number;
  overtimeHoursWorked: number;
}

export interface PayrollResult {
  grossSalary: number;
  totalContributions: number;
  netSalary: number;
}

export function calculatePayroll({ employee, normalHoursWorked, overtimeHoursWorked }: PayrollInput): PayrollResult {
  const grossSalary =
    normalHoursWorked * employee.baseHourlyRate +
    overtimeHoursWorked * employee.baseHourlyRate * OVERTIME_RATE;

  const totalContributions = grossSalary * SOCIAL_CONTRIBUTIONS_RATE;

  const netSalary = grossSalary - totalContributions;

  return {
    grossSalary,
    totalContributions,
    netSalary,
  };
}
