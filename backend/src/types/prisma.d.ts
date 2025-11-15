/**
 * Définitions de types pour les modèles Prisma
 * Utilisé comme solution de contournement lorsque le client Prisma ne peut pas être généré
 */

declare module '@prisma/client' {
  export interface User {
    id: string;
    email: string;
    name: string | null;
    password: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Company {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    grossSalary: number;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Payslip {
    id: string;
    payPeriod: string;
    grossSalary: number;
    deductions: number;
    netSalary: number;
    employeeId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export namespace Prisma {
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, any>;
      clientVersion: string;
      constructor(message: string, { code, clientVersion, meta }: { code: string; clientVersion: string; meta?: Record<string, any> });
    }
  }

  export class PrismaClient {
    user: any;
    company: any;
    employee: any;
    payslip: any;
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
  }
}
