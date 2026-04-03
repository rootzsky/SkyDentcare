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
  Eraser
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
    currentIllnessHistory: z.string(),
    pastIllnessHistory: z.string(),
    allergyHistory: z.object({
      food: z.string(),
      drugs: z.string(),
      anesthesia: z.string(),
      weather: z.string(),
      others: z.string(),
    }),
    medicationHistory: z.object({
      currentMedication: z.string(),
      purpose: z.string(),
      sideEffects: z.string(),
      positiveEffects: z.string(),
      dosageIssues: z.string(),
      regularity: z.string(),
    }),
    socialHistory: z.string(),
    dentalHistory: z.object({
      reasonForVisit: z.string(),
      whatTheyWantToKnow: z.string(),
      xrayLast2Years: z.string(),
      previousTreatmentComplications: z.string(),
      previousVisitOpinion: z.string(),
      dentalHealthGeneralHealthOpinion: z.string(),
      symptoms: z.array(z.string()),
      teethGrinding: z.string(),
      breathAppearanceAnxiety: z.string(),
      injuries: z.string(),
      previousTreatments: z.array(z.string()),
    }),
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
    extraOral: z.object({
      face: z.string(),
      neck: z.string(),
      vermilionBorders: z.string(),
      parotidGlands: z.string(),
      lymphNodes: z.string(),
      anteriorCervical: z.string(),
      posteriorCervical: z.string(),
      submental: z.string(),
      submandibular: z.string(),
      supraclavicular: z.string(),
    }),
    intraOral: z.object({
      labialMucosa: z.string(),
      labialVestibules: z.string(),
      anteriorGingivae: z.string(),
      buccalVestibules: z.string(),
      buccalGingivae: z.string(),
      tongueDorsal: z.string(),
      tongueVentral: z.string(),
      tongueLateral: z.string(),
      lingualTonsils: z.string(),
      floorOfMouth: z.string(),
      lingualGingivae: z.string(),
      tonsillarPillars: z.string(),
      pharyngealWall: z.string(),
      softPalate: z.string(),
      uvula: z.string(),
      hardPalate: z.string(),
      palatalGingivae: z.string(),
      submandibularGlands: z.string(),
    }),
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
  })),
  diagnosis: z.array(z.object({
    unmetNeeds: z.string().min(1, 'Kebutuhan wajib diisi'),
    cause: z.string().min(1, 'Penyebab wajib diisi'),
    signsAndSymptoms: z.string().min(1, 'Tanda & gejala wajib diisi'),
  })).min(1, 'Minimal satu diagnosis wajib diisi'),
  treatmentPlan: z.array(z.string()).min(1, 'Rencana perawatan wajib diisi'),
  actions: z.array(z.object({
    date: z.string(),
    type: z.string(),
    operator: z.string(),
    clinicalNotes: z.string(),
  })),
  education: z.array(z.string()),
  evaluation: z.string(),
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
  { id: 'diagnosis', label: 'Diagnosis & Rencana', icon: ClipboardCheck },
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
        currentIllnessHistory: '',
        pastIllnessHistory: '',
        allergyHistory: { food: '', drugs: '', anesthesia: '', weather: '', others: '' },
        medicationHistory: { currentMedication: '', purpose: '', sideEffects: '', positiveEffects: '', dosageIssues: '', regularity: '' },
        socialHistory: '',
        dentalHistory: {
          reasonForVisit: '',
          whatTheyWantToKnow: '',
          xrayLast2Years: '',
          previousTreatmentComplications: '',
          previousVisitOpinion: '',
          dentalHealthGeneralHealthOpinion: '',
          symptoms: [],
          teethGrinding: '',
          breathAppearanceAnxiety: '',
          injuries: '',
          previousTreatments: [],
        },
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
        extraOral: { face: '', neck: '', vermilionBorders: '', parotidGlands: '', lymphNodes: '', anteriorCervical: '', posteriorCervical: '', submental: '', submandibular: '', supraclavicular: '' },
        intraOral: { labialMucosa: '', labialVestibules: '', anteriorGingivae: '', buccalVestibules: '', buccalGingivae: '', tongueDorsal: '', tongueVentral: '', tongueLateral: '', lingualTonsils: '', floorOfMouth: '', lingualGingivae: '', tonsillarPillars: '', pharyngealWall: '', softPalate: '', uvula: '', hardPalate: '', palatalGingivae: '', submandibularGlands: '' },
      },
      indices: {
        dmft: { d: 0, m: 0, f: 0, total: 0 },
        def_t: { d: 0, e: 0, f: 0, total: 0 },
        ohis: { di: 0, ci: 0, total: 0 },
        cpitn: 0,
        plaqueIndex: 0,
      },
      odontogram: {},
      periodontalStatus: {},
      diagnosis: [{ unmetNeeds: '', cause: '', signsAndSymptoms: '' }],
      treatmentPlan: [''],
      actions: [],
      education: [],
      evaluation: '',
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
  useEffect(() => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
  }, [patientId, patients]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "diagnosis"
  });

  const onSubmit = async (data: MedicalRecordFormData) => {
    try {
      // Use getSignaturePad().toDataURL() to avoid the trim-canvas error
      // getSignaturePad() returns the raw signature_pad instance
      const signature = sigCanvas.current?.getSignaturePad().toDataURL('image/png');
      
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
        - Riwayat Penyakit: ${anamnesis.currentIllnessHistory}
        - Riwayat Gigi: ${anamnesis.dentalHistory.reasonForVisit}
        
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
    
    // Auto-calculate DMF-T
    let d = 0, m = 0, f = 0;
    Object.values(newData).forEach(s => {
      if (s === 'caries') d++;
      if (s === 'missing') m++;
      if (s === 'filling') f++;
    });
    setValue('indices.dmft.d', d);
    setValue('indices.dmft.m', m);
    setValue('indices.dmft.f', f);
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
              {/* Riwayat Medis & Alergi */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Riwayat Medis & Alergi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Textarea label="Keluhan Utama" {...register('anamnesis.mainComplaint')} error={errors.anamnesis?.mainComplaint?.message} />
                  <Textarea label="Riwayat Penyakit Sekarang" {...register('anamnesis.currentIllnessHistory')} />
                  <Textarea label="Riwayat Penyakit Dahulu (5 Tahun Terakhir)" {...register('anamnesis.pastIllnessHistory')} />
                  <Textarea label="Riwayat Sosial" {...register('anamnesis.socialHistory')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Alergi Makanan" {...register('anamnesis.allergyHistory.food')} />
                  <Input label="Alergi Obat" {...register('anamnesis.allergyHistory.drugs')} />
                  <Input label="Alergi Obat Bius" {...register('anamnesis.allergyHistory.anesthesia')} />
                  <Input label="Alergi Cuaca" {...register('anamnesis.allergyHistory.weather')} />
                  <Input label="Alergi Lainnya" {...register('anamnesis.allergyHistory.others')} />
                </div>
              </div>

              {/* Riwayat Obat */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Riwayat Obat (Pharmacological History)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Obat yang sedang dikonsumsi" {...register('anamnesis.medicationHistory.currentMedication')} />
                  <Input label="Untuk apa?" {...register('anamnesis.medicationHistory.purpose')} />
                  <Input label="Efek samping" {...register('anamnesis.medicationHistory.sideEffects')} />
                  <Input label="Pengaruh positif" {...register('anamnesis.medicationHistory.positiveEffects')} />
                  <Input label="Masalah dosis" {...register('anamnesis.medicationHistory.dosageIssues')} />
                  <Input label="Konsumsi teratur?" {...register('anamnesis.medicationHistory.regularity')} />
                </div>
              </div>

              {/* Riwayat Gigi */}
              <div className="space-y-8">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Riwayat Gigi (Dental History)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Textarea label="Alasan utama kunjungan" {...register('anamnesis.dentalHistory.reasonForVisit')} />
                  <Textarea label="Hal yang ingin diketahui" {...register('anamnesis.dentalHistory.whatTheyWantToKnow')} />
                  <Input label="Rontgen foto (2 tahun terakhir)" {...register('anamnesis.dentalHistory.xrayLast2Years')} />
                  <Input label="Komplikasi perawatan sebelumnya" {...register('anamnesis.dentalHistory.previousTreatmentComplications')} />
                  <Input label="Pendapat kunjungan sebelumnya" {...register('anamnesis.dentalHistory.previousVisitOpinion')} />
                  <Input label="Pendapat kesehatan gigi vs umum" {...register('anamnesis.dentalHistory.dentalHealthGeneralHealthOpinion')} />
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
                  <Input label="Wajah" {...register('clinicalExam.extraOral.face')} />
                  <Input label="Leher" {...register('clinicalExam.extraOral.neck')} />
                  <Input label="Bibir (Vermilion Borders)" {...register('clinicalExam.extraOral.vermilionBorders')} />
                  <Input label="Kelenjar Parotis" {...register('clinicalExam.extraOral.parotidGlands')} />
                  <Input label="Kelenjar Limfe" {...register('clinicalExam.extraOral.lymphNodes')} />
                  <Input label="Anterior Cervical" {...register('clinicalExam.extraOral.anteriorCervical')} />
                  <Input label="Posterior Cervical" {...register('clinicalExam.extraOral.posteriorCervical')} />
                  <Input label="Submental" {...register('clinicalExam.extraOral.submental')} />
                  <Input label="Submandibular" {...register('clinicalExam.extraOral.submandibular')} />
                  <Input label="Supraclavicular" {...register('clinicalExam.extraOral.supraclavicular')} />
                </div>
              </div>

              {/* Intra Oral */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em] flex items-center">
                  <span className="w-8 h-px bg-pop-blue/30 mr-3"></span>
                  Pemeriksaan Intra Oral
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Mukosa Labial" {...register('clinicalExam.intraOral.labialMucosa')} />
                  <Input label="Vestibulum Labial" {...register('clinicalExam.intraOral.labialVestibules')} />
                  <Input label="Gingiva Anterior" {...register('clinicalExam.intraOral.anteriorGingivae')} />
                  <Input label="Vestibulum Bukal" {...register('clinicalExam.intraOral.buccalVestibules')} />
                  <Input label="Gingiva Bukal" {...register('clinicalExam.intraOral.buccalGingivae')} />
                  <Input label="Lidah (Dorsal)" {...register('clinicalExam.intraOral.tongueDorsal')} />
                  <Input label="Lidah (Ventral)" {...register('clinicalExam.intraOral.tongueVentral')} />
                  <Input label="Lidah (Lateral)" {...register('clinicalExam.intraOral.tongueLateral')} />
                  <Input label="Tonsil Lingual" {...register('clinicalExam.intraOral.lingualTonsils')} />
                  <Input label="Dasar Mulut" {...register('clinicalExam.intraOral.floorOfMouth')} />
                  <Input label="Gingiva Lingual" {...register('clinicalExam.intraOral.lingualGingivae')} />
                  <Input label="Pilar Tonsil" {...register('clinicalExam.intraOral.tonsillarPillars')} />
                  <Input label="Dinding Faring" {...register('clinicalExam.intraOral.pharyngealWall')} />
                  <Input label="Palatum Lunak" {...register('clinicalExam.intraOral.softPalate')} />
                  <Input label="Uvula" {...register('clinicalExam.intraOral.uvula')} />
                  <Input label="Palatum Keras" {...register('clinicalExam.intraOral.hardPalate')} />
                  <Input label="Gingiva Palatal" {...register('clinicalExam.intraOral.palatalGingivae')} />
                  <Input label="Kelenjar Submandibular" {...register('clinicalExam.intraOral.submandibularGlands')} />
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
                    <span className="text-2xl font-black">{watch('indices.dmft.d') + watch('indices.dmft.m') + watch('indices.dmft.f')}</span>
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
                    <span className="text-2xl font-black">{watch('indices.def_t.d') + watch('indices.def_t.e') + watch('indices.def_t.f')}</span>
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
                  <span className="text-2xl font-black">{(watch('indices.ohis.di') + watch('indices.ohis.ci')).toFixed(1)}</span>
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
                <Textarea label="Catatan Periodontal (Bleeding, Pocket, Attachment Loss)" placeholder="Contoh: Gigi 16 Pocket 5mm, BOP+" />
                <Textarea label="Catatan Kalkulus & Extrinsic Stains" placeholder="Contoh: Kalkulus supragingival pada lingual gigi anterior bawah" />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 6 && (
          <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black text-pop-text uppercase tracking-wider">Diagnosis & Rencana Perawatan</CardTitle>
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
                  <h3 className="text-xs font-black text-pop-blue uppercase tracking-[0.2em]">Diagnosis Dental Hygiene</h3>
                  <Button type="button" onClick={() => append({ unmetNeeds: '', cause: '', signsAndSymptoms: '' })} variant="outline" size="sm" className="rounded-xl border-pop-blue text-pop-blue">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Diagnosis
                  </Button>
                </div>
                
                <div className="space-y-8">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-8 bg-gray-50 rounded-3xl border-2 border-gray-100 relative group">
                      {index > 0 && (
                        <Button type="button" onClick={() => remove(index)} variant="ghost" size="icon" className="absolute top-4 right-4 text-gray-300 hover:text-pop-pink">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 gap-6">
                        <Textarea label="Kebutuhan yang tidak terpenuhi" {...register(`diagnosis.${index}.unmetNeeds`)} error={errors.diagnosis?.[index]?.unmetNeeds?.message} />
                        <Textarea label="Penyebab (Etiologi)" {...register(`diagnosis.${index}.cause`)} error={errors.diagnosis?.[index]?.cause?.message} />
                        <Textarea label="Tanda-tanda dan Gejala" {...register(`diagnosis.${index}.signsAndSymptoms`)} error={errors.diagnosis?.[index]?.signsAndSymptoms?.message} />
                      </div>
                    </div>
                  ))}
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
                  <Textarea label="Rencana Perawatan (Client-Centered Goals)" {...register('treatmentPlan.0')} placeholder="Masukkan rencana perawatan utama..." />
                  
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
                  <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-inner">
                    <SignatureCanvas 
                      ref={sigCanvas}
                      penColor='black'
                      canvasProps={{width: 400, height: 200, className: 'sigCanvas'}}
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

        {currentStep === 7 && (
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
