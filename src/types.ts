/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'dentist' | 'dental_therapist' | 'admin_staff' | 'patient';

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
  incomeRange?: string;
  hobbies?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface Anamnesis {
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
    currentMedication: string;
    purpose: string;
    sideEffects: string;
    positiveEffects: string;
    dosageIssues: string;
    regularity: string;
  };
  socialHistory: string;
  dentalHistory: {
    reasonForVisit: string;
    whatTheyWantToKnow: string;
    xrayLast2Years: string;
    previousTreatmentComplications: string;
    previousVisitOpinion: string;
    dentalHealthGeneralHealthOpinion: string;
    symptoms: string[];
    teethGrinding: string;
    breathAppearanceAnxiety: string;
    injuries: string;
    previousTreatments: string[];
  };
  selfCareHistory: {
    toolsUsed: string[];
    toothpasteType: string[];
    brushingFrequency: string;
    brushingTime: string;
    schedulingDifficulty: string;
    oralCancerCheckRegularity: string;
    habits: string[];
  };
  snackingHabits: {
    [key: string]: string; // e.g., "candy": "frequent"
  };
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
    face: string;
    neck: string;
    vermilionBorders: string;
    parotidGlands: string;
    lymphNodes: string;
    anteriorCervical: string;
    posteriorCervical: string;
    submental: string;
    submandibular: string;
    supraclavicular: string;
  };
  intraOral: {
    labialMucosa: string;
    labialVestibules: string;
    anteriorGingivae: string;
    buccalVestibules: string;
    buccalGingivae: string;
    tongueDorsal: string;
    tongueVentral: string;
    tongueLateral: string;
    lingualTonsils: string;
    floorOfMouth: string;
    lingualGingivae: string;
    tonsillarPillars: string;
    pharyngealWall: string;
    softPalate: string;
    uvula: string;
    hardPalate: string;
    palatalGingivae: string;
    submandibularGlands: string;
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
  plaqueIndex: number;
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
  treatmentPlan: string[];
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
