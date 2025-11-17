/**
 * Définitions de types pour les modèles Prisma
 * Utilisé comme solution de contournement lorsque le client Prisma ne peut pas être généré
 */

declare module '@prisma/client' {
  export interface Utilisateur {
    id: string;
    email: string;
    nom: string | null;
    motDePasse: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Compagnie {
    id: string;
    nom: string;
    proprietaireId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Employe {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    salaireBrut: number;
    department?: string;
    compagnieId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface FichePaie {
    id: string;
    payPeriod: string;
    salaireBrut: number;
    deductions: number;
    salaireNet: number;
    totalCotisationsSalariales?: number;
    totalCotisationsPatronales?: number;
    totalChargesFiscales?: number;
    coutTotal?: number;
    employeId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  // Alias pour compatibilité avec le code existant
  export type User = Utilisateur;
  export type Company = Compagnie;
  export type Employee = Employe;
  export type Payslip = FichePaie;

  export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN'
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
    utilisateur: any;
    compagnie: any;
    employe: any;
    fichePaie: any;
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
  }
}
