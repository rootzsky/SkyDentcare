/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'dentist' | 'dental_therapist' | 'admin_staff' | 'patient' | 'supervisor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  patientId?: string;
  createdAt: Timestamp | string;
}

export interface Patient {
  id: string;
  name: string;
  nik: string;
  medicalRecordNumber: string;
  birthDate: string;
  gender: 'male' | 'female';
  address: string;
  phoneNumber: string;
  insurance: string;
  occupation: string;
  education: string;
  maritalStatus: string;
  religion?: string;
  placeOfBirth?: string;
  nationality?: string;
  bloodType?: string;
  dependents?: {
    children: number;
    others: number;
  };
  weight?: number;
  height?: number;
  dentistInfo?: {
    name: string;
    phone: string;
    address: string;
  };
  doctorInfo?: {
    name: string;
    phone: string;
    address: string;
  };
  referralSource?: string;
  incomeRange?: string;
  hobbies?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface Anamnesis {
  isHealthy: boolean;
  past5YearsHistory: string;
  bloodClottingDisorder: string;
  mainComplaint: string;
  currentIllnessHistory: string;
  pastIllnessHistory: string;
  allergyHistory: {
    food: string;
    drugs: string;
    anesthesia: string;
    weather: string;
    others: string;
  };
  medicationHistory: {
    isTakingMedication: boolean;
    medicationName: string;
    purpose: string;
    sideEffects: string;
    positiveEffects: string;
    dosageIssues: string;
    regularity: string;
  };
  socialHistory: string;
  dentalHistory: {
    reasonForVisit: string;
    whatTheyWantToKnow: string[];
    xrayLast2Years: {
      done: boolean;
      type?: string;
    };
    previousTreatmentComplications: {
      experienced: boolean;
      explanation?: string;
    };
    previousVisitOpinion: string;
    dentalHealthGeneralHealthOpinion: string;
    symptoms: string[];
    teethGrinding: {
      experienced: boolean;
      biteGuard?: boolean;
    };
    breathAppearanceAnxiety: {
      anxious: boolean;
      concerns?: string[];
    };
    injuries: {
      experienced: boolean;
      explanation?: string;
    };
    previousTreatments: string[];
  };
  selfCareHistory: {
    toolsUsed: string[];
    toothpasteBenefits: string[];
    brushingDuration: number;
    flossingDuration: number;
    brushingFrequency: number;
    flossingFrequency: number;
    schedulingDifficulty: boolean;
    oralCancerCheckRegularity: boolean;
    habits: string[];
  };
  snackingHabits: {
    item: string;
    frequency: string;
  }[];
  dentalBeliefs: {
    cavityLikelihood: string;
    preventionImportance: string;
    selfCareAbility: string;
    currentHealthStatus: string;
  };
}

export interface VitalSigns {
  bloodPressure: string;
  pulse: string;
  respiration: string;
}

export interface ClinicalExam {
  vitalSigns: VitalSigns;
  extraOral: {
    [key: string]: {
      status: 'normal' | 'other';
      notes?: string;
    };
  };
  intraOral: {
    [key: string]: {
      status: 'normal' | 'other';
      notes?: string;
    };
  };
}

export type ToothStatus = 'healthy' | 'caries' | 'filling' | 'missing' | 'impaction' | 'prosthesis';

export interface Odontogram {
  [toothNumber: string]: ToothStatus;
}

export interface DentalIndices {
  dmft: {
    d: number;
    m: number;
    f: number;
    total: number;
  };
  def_t: {
    d: number;
    e: number;
    f: number;
    total: number;
  };
  ohis: {
    di: number;
    ci: number;
    total: number;
  };
  cpitn: number;
  plaqueControl: {
    score: number;
    category: string;
    grid: {
      [toothNumber: string]: {
        distal: boolean;
        mesial: boolean;
        buccal: boolean;
        lingual: boolean;
      };
    };
  };
}

export interface PeriodontalStatus {
  bleedingOnProbing: boolean;
  attachmentLossGt1mm: boolean;
  pocketGt4mm: boolean;
  extrinsicStains: boolean;
  calculusScore: number;
}

export interface TreatmentRecord {
  id: string;
  patientId: string;
  date: string;
  anamnesis: Anamnesis;
  clinicalExam: ClinicalExam;
  odontogram: Odontogram;
  indices: DentalIndices;
  periodontalStatus: {
    [toothNumber: string]: PeriodontalStatus;
  };
  diagnosis: {
    unmetNeeds: string;
    cause: string;
    signsAndSymptoms: string;
  }[];
  humanNeeds: {
    healthRiskProtection: string;
    freedomFromFear: string;
    wholesomeFacialImage: string;
    skinMucousMembraneIntegrity: string;
    biologicallySoundDentition: string;
    conceptualizationProblemSolving: string;
    freedomFromPain: string;
    responsibilityForOralHealth: string;
  };
  treatmentPlan: string[];
  dentalHygieneInterventions: string[];
  clientCenteredGoals?: {
    goal: string;
    timeline: string;
    criteria: string;
  }[];
  actions: {
    date: string;
    type: string;
    operator: string;
    clinicalNotes: string;
  }[];
  education: string[];
  evaluation: string;
  signature?: string;
  nextVisit?: string;
  recommendations?: string;
  createdBy: string;
  createdAt: Timestamp | string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: Timestamp | string;
}

export interface BillingItem {
  description: string;
  amount: number;
}

export interface Billing {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  items: BillingItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'transfer' | 'insurance';
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface InformedConsent {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  procedureName: string;
  isAgreed: boolean;
  siteMarking: string[]; // List of tooth numbers
  patientSignature: string; // Base64 image
  witnessSignature?: string; // Base64 image
  doctorSignature: string; // Base64 image
  notes?: string;
  createdAt: Timestamp | string;
}
