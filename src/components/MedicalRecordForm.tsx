/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Stethoscope, 
  Activity, 
  ClipboardCheck,
  FileText,
  CheckCircle2,
  Search,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Eraser,
  Target
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { GoogleGenAI, Type } from "@google/genai";
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/TextArea';
import { Select } from './ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Modal } from './ui/Modal';
import { Odontogram } from './Odontogram';
import { DiagnosisGuidelines } from './DiagnosisGuidelines';
import { PrintableRecord } from './PrintableRecord';
import { ToothStatus, Patient, TreatmentRecord } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { db, collection, onSnapshot, addDoc, OperationType, handleFirestoreError, auth, Timestamp } from '../firebase';
import { toast } from 'sonner';

const medicalRecordSchema = z.object({
  patientId: z.string().min(1, 'Pasien wajib dipilih'),
  anamnesis: z.object({
    mainComplaint: z.string().min(1, 'Keluhan utama wajib diisi'),
    isHealthy: z.boolean(),
    isTakingMedication: z.boolean(),
    experienced: z.boolean(),
    lastDentalVisit: z.string(),
    dentalVisitReason: z.string(),
    previousTreatmentComplications: z.string(),
    previousVisitOpinion: z.string(),
    dentalHealthGeneralHealthOpinion: z.string(),
    symptoms: z.array(z.string()),
    teethGrinding: z.string(),
    breathAppearanceAnxiety: z.string(),
    injuries: z.string(),
    previousTreatments: z.array(z.string()),
    selfCareHistory: z.object({
      toolsUsed: z.array(z.string()),
      toothpasteType: z.array(z.string()),
      brushingFrequency: z.string(),
      brushingTime: z.string(),
      schedulingDifficulty: z.string(),
      oralCancerCheckRegularity: z.string(),
      habits: z.array(z.string()),
    }),
    snackingHabits: z.record(z.string(), z.string()),
    dentalBeliefs: z.object({
      cavityLikelihood: z.string(),
      preventionImportance: z.string(),
      selfCareAbility: z.string(),
      currentHealthStatus: z.string(),
    }),
  }),
  clinicalExam: z.object({
    vitalSigns: z.object({
      bloodPressure: z.string(),
      pulse: z.string(),
      respiration: z.string(),
    }),
    extraOral: z.record(z.string(), z.string()),
    intraOral: z.record(z.string(), z.string()),
  }),
  indices: z.object({
    dmft: z.object({
      d: z.number(),
      m: z.number(),
      f: z.number(),
      total: z.number(),
    }),
    def_t: z.object({
      d: z.number(),
      e: z.number(),
      f: z.number(),
      total: z.number(),
    }),
    ohis: z.object({
      di: z.number(),
      ci: z.number(),
      total: z.number(),
    }),
    plaqueControl: z.object({
      grid: z.record(z.string(), z.array(z.boolean())),
      score: z.number(),
    }),
    cpitn: z.number(),
    plaqueIndex: z.number(),
  }),
  odontogram: z.record(z.string(), z.enum(['healthy', 'caries', 'filling', 'missing', 'impaction', 'prosthesis'])),
  periodontalStatus: z.record(z.string(), z.object({
    bleedingOnProbing: z.boolean(),
    attachmentLossGt1mm: z.boolean(),
    pocketGt4mm: z.boolean(),
    extrinsicStains: z.boolean(),
    calculusScore: z.number(),
  })).optional(),
  periodontalNotes: z.string().optional(),
  calculusNotes: z.string().optional(),
  diagnosis: z.array(z.object({
    unmetNeeds: z.string().min(1, 'Kebutuhan wajib diisi'),
    cause: z.string().min(1, 'Penyebab wajib diisi'),
    signsAndSymptoms: z.string().min(1, 'Tanda & gejala wajib diisi'),
  })).min(1, 'Minimal satu diagnosis wajib diisi'),
  treatmentPlan: z.array(z.string()).min(1, 'Rencana perawatan wajib diisi'),
  interventions: z.object({
    preventive: z.array(z.string()),
    educational: z.array(z.string()),
    therapeutic: z.array(z.string()),
    referral: z.array(z.string()),
  }).optional(),
  actions: z.array(z.object({
    date: z.string(),
    type: z.string(),
    operator: z.string(),
    clinicalNotes: z.string(),
  })),
  education: z.array(z.string()),
  evaluation: z.string(),
  clientCenteredGoals: z.array(z.object({
    goal: z.string(),
    timeline: z.string(),
    criteria: z.string(),
  })).optional(),
  nextVisit: z.string().optional(),
  recommendations: z.string().optional(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

const steps = [
  { id: 'patient', label: 'Pilih Pasien', icon: Search },
  { id: 'anamnesis', label: 'Anamnesis', icon: FileText },
  { id: 'clinical', label: 'Pemeriksaan Klinis', icon: Stethoscope },
  { id: 'odontogram', label: 'Odontogram', icon: Activity },
  { id: 'indices', label: 'Indeks Kesehatan', icon: Activity },
  { id: 'periodontal', label: 'Periodontal & Stains', icon: Activity },
  { id: 'diagnosis', label: 'Diagnosis', icon: ClipboardCheck },
  { id: 'goals', label: 'Client Centered Goals', icon: Target },
  { id: 'finish', label: 'Selesai', icon: CheckCircle2 },
];

export function MedicalRecordForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [odontogramData, setOdontogramData] = useState<Record<string, ToothStatus>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<any>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    control,
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patientId: '',
      anamnesis: {
        mainComplaint: '',
        isHealthy: true,
        isTakingMedication: false,
        experienced: false,
        lastDentalVisit: '',
        dentalVisitReason: '',
        previousTreatmentComplications: '',
        previousVisitOpinion: '',
        dentalHealthGeneralHealthOpinion: '',
        symptoms: [],
        teethGrinding: '',
        breathAppearanceAnxiety: '',
        injuries: '',
        previousTreatments: [],
        selfCareHistory: {
          toolsUsed: [],
          toothpasteType: [],
          brushingFrequency: '',
          brushingTime: '',
          schedulingDifficulty: '',
          oralCancerCheckRegularity: '',
          habits: [],
        },
        snackingHabits: {},
        dentalBeliefs: { cavityLikelihood: '', preventionImportance: '', selfCareAbility: '', currentHealthStatus: '' },
      },
      clinicalExam: {
        vitalSigns: { bloodPressure: '', pulse: '', respiration: '' },
        extraOral: {},
        intraOral: {},
      },
      indices: {
        dmft: { d: 0, m: 0, f: 0, total: 0 },
        def_t: { d: 0, e: 0, f: 0, total: 0 },
        ohis: { di: 0, ci: 0, total: 0 },
        plaqueControl: {
          grid: {
            '16': [false, false, false, false, false, false],
            '11': [false, false, false, false, false, false],
            '26': [false, false, false, false, false, false],
            '36': [false, false, false, false, false, false],
            '31': [false, false, false, false, false, false],
            '46': [false, false, false, false, false, false],
          },
          score: 0,
        },
        cpitn: 0,
        plaqueIndex: 0,
      },
      odontogram: {},
      periodontalStatus: {},
      diagnosis: [{ unmetNeeds: '', cause: '', signsAndSymptoms: '' }],
      treatmentPlan: [''],
      interventions: {
        preventive: [],
        educational: [],
        therapeutic: [],
        referral: [],
      },
      actions: [],
      education: [],
      evaluation: '',
      clientCenteredGoals: [{ goal: '', timeline: '', criteria: '' }],
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const patientList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];
        setPatients(patientList);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'patients')
    );

    return () => unsubscribe();
  }, []);

  const patientId = watch('patientId');
  const watchOHIS_DI = watch('indices.ohis.di');
  const watchOHIS_CI = watch('indices.ohis.ci');
  const watchPlaqueGrid = watch('indices.plaqueControl.grid');

  useEffect(() => {
    const total = parseFloat(((watchOHIS_DI || 0) + (watchOHIS_CI || 0)).toFixed(1));
    setValue('indices.ohis.total', total);
  }, [watchOHIS_DI, watchOHIS_CI, setValue]);

  useEffect(() => {
    if (!watchPlaqueGrid) return;
    let totalSites = 0;
    let positiveSites = 0;
    Object.values(watchPlaqueGrid).forEach(sites => {
      sites.forEach(site => {
        totalSites++;
        if (site) positiveSites++;
      });
    });
    const score = totalSites > 0 ? (positiveSites / totalSites) * 100 : 0;
    setValue('indices.plaqueControl.score', Math.round(score));
  }, [watchPlaqueGrid, setValue]);

  useEffect(() => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
  }, [patientId, patients]);

  const { fields: diagnosisFields, append: appendDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control,
    name: "diagnosis"
  });

  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({
    control,
    name: "clientCenteredGoals"
  });

  const onSubmit = async (data: MedicalRecordFormData) => {
    try {
      // Ensure totals are calculated before saving
      data.indices.ohis.total = parseFloat(((data.indices.ohis.di || 0) + (data.indices.ohis.ci || 0)).toFixed(1));
      data.indices.dmft.total = (data.indices.dmft.d || 0) + (data.indices.dmft.m || 0) + (data.indices.dmft.f || 0);
      data.indices.def_t.total = (data.indices.def_t.d || 0) + (data.indices.def_t.e || 0) + (data.indices.def_t.f || 0);

      // Use getSignaturePad().toDataURL() to avoid the trim-canvas error
      const signature = sigCanvas.current?.isEmpty() ? null : sigCanvas.current?.toDataURL('image/png');
      
      const recordData = {
        ...data,
        odontogram: odontogramData,
        signature,
        date: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'unknown',
        createdAt: Timestamp.now(),
      };

      console.log('Saving record data:', recordData);
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'patients', data.patientId, 'records'), recordData);
      console.log('Record saved with ID:', docRef.id);

      setSubmittedRecord(recordData);
      toast.success('Rekam medis berhasil disimpan');
      setCurrentStep(steps.length - 1);
    } catch (error) {
      console.error('Error in onSubmit:', error);
      handleFirestoreError(error, OperationType.CREATE, `patients/${data.patientId}/records`);
      toast.error('Gagal menyimpan rekam medis. Periksa koneksi atau izin.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const generateAIDiagnosis = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const anamnesis = watch('anamnesis');
      const clinical = watch('clinicalExam');
      const odontogram = odontogramData;

      const prompt = `
        Sebagai pakar Dental Hygiene, buatkan analisis diagnosis berdasarkan data berikut:
        
        ANAMNESIS:
        - Keluhan Utama: ${anamnesis.mainComplaint}
        - Status Kesehatan: ${anamnesis.isHealthy ? 'Sehat' : 'Ada Masalah'}
        - Sedang Pengobatan: ${anamnesis.isTakingMedication ? 'Ya' : 'Tidak'}
        - Riwayat Kunjungan Gigi: ${anamnesis.lastDentalVisit} (Alasan: ${anamnesis.dentalVisitReason})
        - Gejala: ${anamnesis.symptoms.join(', ')}
        - Kebiasaan: ${anamnesis.selfCareHistory.habits.join(', ')}
        
        PEMERIKSAAN KLINIS:
        - Vital Signs: BP ${clinical.vitalSigns.bloodPressure}, Pulse ${clinical.vitalSigns.pulse}
        - Intra Oral: ${JSON.stringify(clinical.intraOral)}
        
        ODONTOGRAM:
        ${JSON.stringify(odontogram)}
        
        Gunakan pedoman 8 Kebutuhan Dasar Manusia:
        1. Perlindungan dari risiko kesehatan
        2. Bebas dari rasa takut/cemas
        3. Citra tubuh yang sehat
        4. Integritas mukosa kulit & kepala leher
        5. Bebas dari rasa sakit
        6. Konsep diri yang sehat
        7. Tanggung jawab atas kesehatan gigi sendiri
        8. Pengetahuan tentang kesehatan gigi
        
        Berikan output dalam format JSON array of objects:
        [{ "unmetNeeds": "...", "cause": "...", "signsAndSymptoms": "..." }]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                unmetNeeds: { type: Type.STRING },
                cause: { type: Type.STRING },
                signsAndSymptoms: { type: Type.STRING }
              },
              required: ["unmetNeeds", "cause", "signsAndSymptoms"]
            }
          }
        }
      });

      const result = JSON.parse(response.text || '[]');
      if (result.length > 0) {
        setValue('diagnosis', result);
        toast.success('AI berhasil men-generate diagnosis');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal men-generate AI diagnosis');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAITreatmentPlan = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const diagnosis = watch('diagnosis');
      
      const prompt = `
        Berdasarkan diagnosis dental hygiene berikut:
        ${JSON.stringify(diagnosis)}
        
        Buatkan rencana intervensi oleh TGM (Terapis Gigi dan Mulut) yang mencakup:
        1. Tindakan klinis
        2. Edukasi pasien
        3. Instruksi perawatan di rumah
        
        Berikan output dalam format JSON array of strings.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const result = JSON.parse(response.text || '[]');
      if (result.length > 0) {
        setValue('treatmentPlan', result);
        toast.success('AI berhasil men-generate rencana perawatan');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal men-generate AI rencana perawatan');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAIClientGoals = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const diagnosis = watch('diagnosis');
      
      const prompt = `
        Berdasarkan diagnosis dental hygiene berikut:
        ${JSON.stringify(diagnosis)}
        
        Buatkan Client-Centered Goals (Tujuan Berpusat pada Klien) yang mencakup:
        1. Goal (Tujuan yang ingin dicapai)
        2. Timeline (Waktu pencapaian, misal: 1 minggu, 1 bulan)
        3. Criteria (Kriteria keberhasilan)
        
        Berikan output dalam format JSON array of objects:
        [{ "goal": "...", "timeline": "...", "criteria": "..." }]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                goal: { type: Type.STRING },
                timeline: { type: Type.STRING },
                criteria: { type: Type.STRING }
              },
              required: ["goal", "timeline", "criteria"]
            }
          }
        }
      });

      const result = JSON.parse(response.text || '[]');
      if (result.length > 0) {
        setValue('clientCenteredGoals', result);
        toast.success('AI berhasil men-generate Client-Centered Goals');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal men-generate AI Client-Centered Goals');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAIEvaluation = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const diagnosis = watch('diagnosis');
      const treatmentPlan = watch('treatmentPlan');
      
      const prompt = `
        Berdasarkan diagnosis:
        ${JSON.stringify(diagnosis)}
        
        Dan rencana perawatan:
        ${JSON.stringify(treatmentPlan)}
        
        Buatkan pernyataan evaluasi (Evaluative Statement) untuk asuhan kesehatan gigi.
        Berikan output dalam format string teks.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (response.text) {
        setValue('evaluation', response.text);
        toast.success('AI berhasil men-generate evaluasi');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal men-generate AI evaluasi');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleToothChange = (toothNumber: string, status: ToothStatus) => {
    const newData = { ...odontogramData, [toothNumber]: status };
    setOdontogramData(newData);
    
    // Auto-calculate DMF-T (Permanent) and def-t (Deciduous)
    let d = 0, m = 0, f = 0;
    let dd = 0, ee = 0, ff = 0;

    Object.entries(newData).forEach(([num, s]) => {
      const n = parseInt(num);
      // Permanent teeth: 11-48
      if (n >= 11 && n <= 48) {
        if (s === 'caries') d++;
        if (s === 'missing') m++;
        if (s === 'filling') f++;
      }
      // Deciduous teeth: 51-85
      else if (n >= 51 && n <= 85) {
        if (s === 'caries') dd++;
        if (s === 'missing') ee++; // In deciduous, missing due to caries is 'e'
        if (s === 'filling') ff++;
      }
    });

    setValue('indices.dmft.d', d);
    setValue('indices.dmft.m', m);
    setValue('indices.dmft.f', f);
    setValue('indices.dmft.total', d + m + f);

    setValue('indices.def_t.d', dd);
    setValue('indices.def_t.e', ee);
    setValue('indices.def_t.f', ff);
    setValue('indices.def_t.total', dd + ee + ff);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Rekam <span className="text-pop-blue">Dental Hygiene</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Lengkapi rekam medis pasien dengan standar asuhan kesehatan gigi.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setIsGuidelinesOpen(true)} className="flex items-center space-x-3 text-pop-blue border-2 border-gray-100 bg-white hover:bg-pop-blue/5 rounded-[2rem] px-8 py-8 font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-gray-200/50">
            <BookOpen className="h-5 w-5" />
            <span>Pedoman Diagnosa</span>
          </Button>
          {selectedPatient && (
            <div className="hidden lg:flex flex-col items-end bg-pop-blue/5 px-6 py-4 rounded-[2rem] border-2 border-pop-blue/10 shadow-lg shadow-pop-blue/5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasien Aktif</span>
              <span className="font-black text-pop-blue text-lg tracking-tight">{selectedPatient.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="relative flex justify-between items-center px-10 py-12 bg-white rounded-[3rem] border-2 border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
        <div className="absolute top-1/2 left-16 right-16 h-2 bg-gray-50 -translate-y-1/2 -z-0 rounded-full" />
        <div 
          className="absolute top-1/2 left-16 h-2 bg-pop-blue -translate-y-1/2 transition-all duration-700 ease-in-out z-0 shadow-[0_0_20px_rgba(0,212,255,0.5)] rounded-full" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 82}%` }}
        />
        {steps.map((step, index) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center space-y-4 group">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all duration-500 shadow-xl",
              index < currentStep ? "bg-pop-blue border-pop-blue text-white shadow-pop-blue/20" : 
              index === currentStep ? "bg-white border-pop-blue text-pop-blue scale-125 shadow-[0_0_30px_rgba(0,212,255,0.3)] ring-4 ring-pop-blue/10" : 
              "bg-white border-gray-100 text-gray-300 shadow-gray-100/50"
            )}>
              {index < currentStep ? <CheckCircle2 className="h-8 w-8" /> : <step.icon className="h-8 w-8" />}
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.25em] hidden md:block transition-all duration-500 italic",
              index <= currentStep ? "text-pop-blue translate-y-1" : "text-gray-400"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-pop-pink/10 border-2 border-pop-pink/20 p-6 rounded-[2rem] animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-pop-pink flex items-center justify-center text-white">
              <Trash2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-pop-pink uppercase tracking-widest">Ada kesalahan pada form:</h3>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(errors).map(([key, error]: [string, any]) => (
              <li key={key} className="text-[10px] font-bold text-pop-pink uppercase tracking-wider">
                {key}: {error.message || 'Data tidak valid'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {currentStep === 0 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Pilih Pasien</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Cari Pasien Terdaftar</label>
                <Select {...register('patientId')} className="py-4 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-bold text-pop-text h-14">
                  <option value="" className="bg-white">-- Pilih Pasien --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id} className="bg-white">{p.name} ({p.medicalRecordNumber})</option>
                  ))}
                </Select>
                {errors.patientId && <p className="text-xs text-pop-pink font-bold">{errors.patientId.message}</p>}
              </div>
              {selectedPatient && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-pop-blue/5 rounded-3xl border-2 border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK</p>
                    <p className="font-bold text-pop-blue">{selectedPatient.nik}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Lahir</p>
                    <p className="font-bold text-pop-blue">{selectedPatient.birthDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender</p>
                    <p className="font-bold text-pop-blue capitalize">{selectedPatient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Anamnesis Lengkap</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              {/* Keluhan Utama */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Keluhan Utama
                </h3>
                <Textarea {...register('anamnesis.mainComplaint')} error={errors.anamnesis?.mainComplaint?.message} placeholder="Tuliskan keluhan utama pasien..." />
              </div>

              {/* Riwayat Medis */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Riwayat Medis (Medical History)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                    <input type="checkbox" {...register('anamnesis.isHealthy')} className="w-5 h-5 rounded border-gray-300 text-pop-blue focus:ring-pop-blue" />
                    <label className="text-xs font-bold text-pop-text uppercase tracking-wider">Sehat?</label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                    <input type="checkbox" {...register('anamnesis.isTakingMedication')} className="w-5 h-5 rounded border-gray-300 text-pop-blue focus:ring-pop-blue" />
                    <label className="text-xs font-bold text-pop-text uppercase tracking-wider">Sedang Minum Obat?</label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                    <input type="checkbox" {...register('anamnesis.experienced')} className="w-5 h-5 rounded border-gray-300 text-pop-blue focus:ring-pop-blue" />
                    <label className="text-xs font-bold text-pop-text uppercase tracking-wider">Pernah Dirawat?</label>
                  </div>
                </div>
              </div>

              {/* Riwayat Gigi */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Riwayat Gigi (Dental History)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input label="Kunjungan Terakhir" {...register('anamnesis.lastDentalVisit')} placeholder="Kapan terakhir kali ke dokter gigi?" />
                  <Input label="Alasan Kunjungan" {...register('anamnesis.dentalVisitReason')} />
                  <Input label="Komplikasi Perawatan Sebelumnya" {...register('anamnesis.previousTreatmentComplications')} />
                  <Input label="Pendapat Kunjungan Sebelumnya" {...register('anamnesis.previousVisitOpinion')} />
                  <Input label="Pendapat Kesehatan Gigi vs Umum" {...register('anamnesis.dentalHealthGeneralHealthOpinion')} />
                  <Input label="Gejala (Symptoms)" {...register('anamnesis.symptoms')} placeholder="Pisahkan dengan koma" />
                </div>
              </div>

              {/* Kebiasaan & Kepercayaan */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Kebiasaan & Kepercayaan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input label="Teeth Grinding" {...register('anamnesis.teethGrinding')} />
                  <Input label="Breath Appearance Anxiety" {...register('anamnesis.breathAppearanceAnxiety')} />
                  <Input label="Injuries" {...register('anamnesis.injuries')} />
                  <Input label="Frekuensi Sikat Gigi" {...register('anamnesis.selfCareHistory.brushingFrequency')} />
                  <Input label="Waktu Sikat Gigi" {...register('anamnesis.selfCareHistory.brushingTime')} />
                  <Input label="Kebiasaan Lain" {...register('anamnesis.selfCareHistory.habits')} placeholder="Pisahkan dengan koma" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Pemeriksaan Klinis Lengkap</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              {/* Tanda Vital */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Tanda-tanda Vital
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Tekanan Darah" {...register('clinicalExam.vitalSigns.bloodPressure')} placeholder="120/80 mmHg" />
                  <Input label="Denyut Nadi" {...register('clinicalExam.vitalSigns.pulse')} placeholder="80 BPM" />
                  <Input label="Pernafasan" {...register('clinicalExam.vitalSigns.respiration')} placeholder="20 RPM" />
                </div>
              </div>

              {/* Ekstra Oral */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Pemeriksaan Ekstra Oral
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Wajah', 'Leher', 'Bibir', 'Kelenjar Parotis', 'Kelenjar Limfe', 'Anterior Cervical', 'Posterior Cervical', 'Submental', 'Submandibular', 'Supraclavicular'].map(field => (
                    <Input key={field} label={field} {...register(`clinicalExam.extraOral.${field}`)} />
                  ))}
                </div>
              </div>

              {/* Intra Oral */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Pemeriksaan Intra Oral
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Mukosa Labial', 'Vestibulum Labial', 'Gingiva Anterior', 'Vestibulum Bukal', 'Gingiva Bukal', 'Lidah', 'Dasar Mulut', 'Gingiva Lingual', 'Palatum', 'Uvula', 'Kelenjar Submandibular'].map(field => (
                    <Input key={field} label={field} {...register(`clinicalExam.intraOral.${field}`)} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Odontogram Interaktif</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="bg-gray-50/50 rounded-3xl p-8 border-2 border-gray-100">
                <Odontogram data={odontogramData} onChange={handleToothChange} />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Indeks Kesehatan Gigi</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* DMF-T */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                    <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                    Indeks DMF-T (Gigi Tetap)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Input type="number" label="D" {...register('indices.dmft.d', { valueAsNumber: true })} />
                    <Input type="number" label="M" {...register('indices.dmft.m', { valueAsNumber: true })} />
                    <Input type="number" label="F" {...register('indices.dmft.f', { valueAsNumber: true })} />
                  </div>
                  <div className="bg-pop-blue/10 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase">Total DMF-T</span>
                    <span className="text-2xl font-black">{(watch('indices.dmft.d') || 0) + (watch('indices.dmft.m') || 0) + (watch('indices.dmft.f') || 0)}</span>
                  </div>
                </div>

                {/* def-t */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-pop-pink uppercase tracking-[0.2em] flex items-center">
                    <span className="w-8 h-px bg-pop-pink/30 mr-3"></span>
                    Indeks def-t (Gigi Susu)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Input type="number" label="d" {...register('indices.def_t.d', { valueAsNumber: true })} />
                    <Input type="number" label="e" {...register('indices.def_t.e', { valueAsNumber: true })} />
                    <Input type="number" label="f" {...register('indices.def_t.f', { valueAsNumber: true })} />
                  </div>
                  <div className="bg-pop-pink/10 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase">Total def-t</span>
                    <span className="text-2xl font-black">{watch('indices.def_t.total')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Indeks OHI-S
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input type="number" step="0.1" label="Debris Index (DI)" {...register('indices.ohis.di', { valueAsNumber: true })} />
                  <Input type="number" step="0.1" label="Calculus Index (CI)" {...register('indices.ohis.ci', { valueAsNumber: true })} />
                </div>
                <div className="bg-pop-purple/10 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase">Total OHI-S</span>
                  <span className="text-2xl font-black">{watch('indices.ohis.total')}</span>
                </div>
              </div>

              {/* Plaque Control Grid */}
              <div className="space-y-8 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                    <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                    Plaque Control Record (PCR)
                  </h3>
                  <div className="bg-pop-blue/10 px-6 py-3 rounded-2xl border-2 border-pop-blue/20">
                    <span className="text-[10px] font-black text-pop-blue uppercase tracking-widest mr-2">Score:</span>
                    <span className="text-xl font-black text-pop-blue">{watch('indices.plaqueControl.score')}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {Object.keys(watchPlaqueGrid || {}).map((toothNum) => (
                    <div key={toothNum} className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                      <p className="text-center font-black text-pop-text text-lg mb-4">Gigi {toothNum}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4, 5].map((siteIndex) => (
                          <button
                            key={siteIndex}
                            type="button"
                            onClick={() => {
                              const currentGrid = { ...watchPlaqueGrid };
                              currentGrid[toothNum][siteIndex] = !currentGrid[toothNum][siteIndex];
                              setValue('indices.plaqueControl.grid', currentGrid);
                            }}
                            className={cn(
                              "w-full aspect-square rounded-lg border-2 transition-all",
                              watchPlaqueGrid?.[toothNum]?.[siteIndex] 
                                ? "bg-pop-pink border-pop-pink shadow-lg shadow-pop-pink/20" 
                                : "bg-white border-gray-200 hover:border-pop-pink/50"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input type="number" label="CPITN" {...register('indices.cpitn', { valueAsNumber: true })} />
                <Input type="number" label="Plaque Index" {...register('indices.plaqueIndex', { valueAsNumber: true })} />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Periodontal, Kalkulus & Stains</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-8 bg-pop-blue/5 rounded-3xl border-2 border-pop-blue/10">
                <p className="text-xs text-gray-500 font-medium leading-relaxed italic">
                  Catatan: Masukkan status periodontal untuk gigi yang diperiksa sesuai dengan formulir. 
                  Gunakan odontogram untuk visualisasi letak kalkulus.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Textarea 
                  label="Catatan Periodontal (Bleeding, Pocket, Attachment Loss)" 
                  placeholder="Contoh: Gigi 16 Pocket 5mm, BOP+" 
                  {...register('periodontalNotes')}
                />
                <Textarea 
                  label="Catatan Kalkulus & Extrinsic Stains" 
                  placeholder="Contoh: Kalkulus supragingival pada lingual gigi anterior bawah" 
                  {...register('calculusNotes')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 6 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Diagnosis Dental Hygiene</CardTitle>
              <Button 
                type="button" 
                onClick={generateAIDiagnosis} 
                disabled={isGeneratingAI}
                className="bg-gradient-to-r from-pop-purple to-pop-pink text-white rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 shadow-lg shadow-pop-purple/20"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGeneratingAI ? 'Menganalisis...' : 'AI Generate Diagnosis'}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Diagnosis (Berdasarkan 8 Kebutuhan Manusia)</h3>
                  <Button type="button" onClick={() => appendDiagnosis({ unmetNeeds: '', cause: '', signsAndSymptoms: '' })} variant="outline" size="sm" className="rounded-xl border-pop-blue text-pop-blue">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Diagnosis
                  </Button>
                </div>
                
                <div className="space-y-8">
                  {diagnosisFields.map((field, index) => (
                    <div key={field.id} className="p-8 bg-gray-50 rounded-3xl border-2 border-gray-100 relative group">
                      {index > 0 && (
                        <Button type="button" onClick={() => removeDiagnosis(index)} variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:text-pop-pink">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kebutuhan yang tidak terpenuhi</label>
                          <Select {...register(`diagnosis.${index}.unmetNeeds`)} className="py-4 bg-white border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-bold text-pop-text h-14">
                            <option value="">-- Pilih Kebutuhan --</option>
                            <option value="Perlindungan dari resiko kesehatan">1. Perlindungan dari resiko kesehatan</option>
                            <option value="Bebas dari ketakutan dan stress">2. Bebas dari ketakutan dan stress</option>
                            <option value="Kesan wajah yang sehat">3. Kesan wajah yang sehat</option>
                            <option value="Kondisi biologis dan fungsi gigi-geligi yang baik">4. Kondisi biologis dan fungsi gigi-geligi yang baik</option>
                            <option value="Keutuhan kulit dan membran mukosa pada kepala dan leher">5. Keutuhan kulit dan membran mukosa pada kepala dan leher</option>
                            <option value="Terbebas dari nyeri pada kepala dan leher">6. Terbebas dari nyeri pada kepala dan leher</option>
                            <option value="Konseptualisasi dan pemecahan masalah">7. Konseptualisasi dan pemecahan masalah</option>
                            <option value="Tanggung jawab untuk kesehatan mulut">8. Tanggung jawab untuk kesehatan mulut</option>
                          </Select>
                        </div>
                        <Textarea label="Penyebab (Etiologi)" {...register(`diagnosis.${index}.cause`)} error={errors.diagnosis?.[index]?.cause?.message} />
                        <Textarea label="Tanda-tanda dan Gejala" {...register(`diagnosis.${index}.signsAndSymptoms`)} error={errors.diagnosis?.[index]?.signsAndSymptoms?.message} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 7 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Client-Centered Goals</CardTitle>
              <Button 
                type="button" 
                onClick={generateAIClientGoals} 
                disabled={isGeneratingAI}
                className="bg-gradient-to-r from-pop-blue to-pop-purple text-white rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 shadow-lg shadow-pop-blue/20"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGeneratingAI ? 'Menganalisis...' : 'AI Generate Goals'}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Tujuan Berpusat pada Klien</h3>
                  <Button type="button" onClick={() => appendGoal({ goal: '', timeline: '', criteria: '' })} variant="outline" size="sm" className="rounded-xl border-pop-blue text-pop-blue">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Goal
                  </Button>
                </div>
                
                <div className="space-y-8">
                  {goalFields.map((field, index) => (
                    <div key={field.id} className="p-8 bg-gray-50 rounded-3xl border-2 border-gray-100 relative group">
                      {index > 0 && (
                        <Button type="button" onClick={() => removeGoal(index)} variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:text-pop-pink">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 gap-6">
                        <Textarea label="Goal (Tujuan)" {...register(`clientCenteredGoals.${index}.goal`)} />
                        <Input label="Timeline (Waktu)" {...register(`clientCenteredGoals.${index}.timeline`)} />
                        <Textarea label="Criteria (Kriteria Keberhasilan)" {...register(`clientCenteredGoals.${index}.criteria`)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Intervensi Dental Hygiene</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-pop-blue uppercase tracking-widest flex items-center">
                      <span className="w-4 h-px bg-pop-blue/30 mr-2"></span>
                      Preventive
                    </h4>
                    <Textarea placeholder="Contoh: Scaling, Polishing, Topical Fluoride..." {...register('interventions.preventive.0')} />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-pop-blue uppercase tracking-widest flex items-center">
                      <span className="w-4 h-px bg-pop-blue/30 mr-2"></span>
                      Educational
                    </h4>
                    <Textarea placeholder="Contoh: Instruksi menyikat gigi, Edukasi diet..." {...register('interventions.educational.0')} />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-pop-blue uppercase tracking-widest flex items-center">
                      <span className="w-4 h-px bg-pop-blue/30 mr-2"></span>
                      Therapeutic
                    </h4>
                    <Textarea placeholder="Contoh: Perawatan periodontal, Desensitisasi..." {...register('interventions.therapeutic.0')} />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-pop-blue uppercase tracking-widest flex items-center">
                      <span className="w-4 h-px bg-pop-blue/30 mr-2"></span>
                      Referral
                    </h4>
                    <Textarea placeholder="Contoh: Rujuk ke Dokter Gigi Spesialis..." {...register('interventions.referral.0')} />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Rencana & Evaluasi</h3>
                  <Button 
                    type="button" 
                    onClick={generateAITreatmentPlan} 
                    disabled={isGeneratingAI}
                    className="bg-gradient-to-r from-pop-blue to-pop-purple text-white rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 shadow-lg shadow-pop-blue/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isGeneratingAI ? 'Menganalisis...' : 'AI Generate Rencana'}</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <Textarea label="Rencana Perawatan" {...register('treatmentPlan.0')} placeholder="Masukkan rencana perawatan utama..." />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Evaluasi (Evaluative Statement)</label>
                      <Button 
                        type="button" 
                        onClick={generateAIEvaluation} 
                        disabled={isGeneratingAI}
                        variant="ghost"
                        className="text-pop-purple hover:bg-pop-purple/5 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Generate Evaluasi
                      </Button>
                    </div>
                    <Textarea {...register('evaluation')} />
                  </div>

                  <Textarea label="Rekomendasi" {...register('recommendations')} />
                  <Input type="date" label="Jadwal Kunjungan Berikutnya" {...register('nextVisit')} />
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Tanda Tangan Pasien</h3>
                <div className="bg-gray-50 rounded-3xl border-2 border-gray-100 p-8 flex flex-col items-center space-y-4">
                  <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-inner w-full max-w-[400px]">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      penColor='black'
                      canvasProps={{
                        className: 'sigCanvas w-full h-[200px]',
                        style: { width: '100%', height: '200px' }
                      }}
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => sigCanvas.current?.clear()}
                    className="flex items-center space-x-2 text-pop-pink border-pop-pink/20 hover:bg-pop-pink/5"
                  >
                    <Eraser className="h-4 w-4" />
                    <span>Hapus Tanda Tangan</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 8 && (
          <Card className="border-2 border-gray-100 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden rounded-[3rem] text-center py-20">
            <CardContent className="space-y-10">
              <div className="flex justify-center">
                <div className="bg-pop-blue/5 p-10 rounded-[2.5rem] shadow-2xl shadow-pop-blue/10 border-2 border-pop-blue/10">
                  <CheckCircle2 className="h-24 w-24 text-pop-blue" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-pop-text tracking-tight uppercase italic">Rekam Medis Tersimpan</h2>
                <p className="text-gray-400 font-bold max-w-md mx-auto leading-relaxed uppercase tracking-widest text-[10px]">
                  Data rekam medis dental hygiene telah berhasil dienkripsi dan disimpan secara permanen dalam sistem RME.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Button 
                  onClick={handlePrint}
                  variant="ghost" 
                  className="rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 text-pop-text hover:bg-gray-50 bg-white shadow-lg shadow-gray-100/50"
                >
                  Cetak Laporan
                </Button>
                <Button onClick={() => window.location.href = '#dashboard'} variant="primary" className="rounded-2xl px-10 py-8 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-pop-blue/30">
                  Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep < steps.length - 1 && (
          <div className="flex justify-between items-center pt-10">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-3 text-gray-400 hover:text-pop-text font-bold px-6 py-6 rounded-2xl transition-all"
            >
              <ChevronLeft className="h-6 w-6" />
              <span>Sebelumnya</span>
            </Button>
            
            {currentStep === steps.length - 2 ? (
              <Button type="submit" disabled={isSubmitting} variant="primary" className="flex items-center space-x-3 rounded-2xl px-10 py-7 font-black uppercase tracking-wider transition-all shadow-lg shadow-pop-blue/20">
                <Save className="h-6 w-6" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Rekam Medis'}</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                variant="primary"
                className="flex items-center space-x-3 rounded-2xl px-10 py-7 font-black uppercase tracking-wider transition-all shadow-lg shadow-pop-blue/20"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>
        )}
      </form>

      <Modal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
        title="Pedoman Diagnosa Asuhan Kesehatan Gigi"
        className="max-w-5xl h-[80vh] overflow-y-auto"
      >
        <DiagnosisGuidelines />
      </Modal>

      {submittedRecord && selectedPatient && (
        <PrintableRecord patient={selectedPatient} record={submittedRecord} />
      )}
    </div>
  );
}
