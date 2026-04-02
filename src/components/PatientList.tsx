/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  FileText, 
  Edit, 
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { cn } from '@/src/lib/utils';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, OperationType, handleFirestoreError, getDocs, query, orderBy, Timestamp } from '../firebase';
import { Patient } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const patientSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  nik: z.string().length(16, 'NIK harus 16 digit'),
  medicalRecordNumber: z.string().min(1, 'No. RM wajib diisi'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender: z.enum(['male', 'female']),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
  phoneNumber: z.string().min(10, 'No. HP minimal 10 digit'),
  insurance: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  maritalStatus: z.string().optional(),
  incomeRange: z.string().optional(),
  hobbies: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export function PatientList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'male',
    }
  });

  useEffect(() => {
    if (isModalOpen && !isSubmitting && !isEditing) {
      const generateRMNumber = () => {
        if (patients.length === 0) return 'RM-001';
        
        const numbers = patients.map(p => {
          const match = p.medicalRecordNumber.match(/RM-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        
        const maxNumber = Math.max(...numbers, 0);
        return `RM-${(maxNumber + 1).toString().padStart(3, '0')}`;
      };
      
      setValue('medicalRecordNumber', generateRMNumber());
    }
  }, [isModalOpen, patients, setValue, isSubmitting, isEditing]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const patientList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];
        setPatients(patientList);
        setIsLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'patients')
    );

    return () => unsubscribe();
  }, []);

  const fetchRecords = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsRecordsModalOpen(true);
    setIsLoadingRecords(true);
    try {
      const q = query(collection(db, 'patients', patient.id, 'records'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatientRecords(records);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `patients/${patient.id}/records`);
      toast.error('Gagal memuat rekam medis');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (isEditing && editingPatient) {
        const patientRef = doc(db, 'patients', editingPatient.id);
        await updateDoc(patientRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
        toast.success('Data pasien berhasil diperbarui');
      } else {
        const newPatient = {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, 'patients'), newPatient);
        toast.success('Pasien berhasil ditambahkan');
      }
      setIsModalOpen(false);
      reset();
      setIsEditing(false);
      setEditingPatient(null);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'patients');
      toast.error(isEditing ? 'Gagal memperbarui data pasien' : 'Gagal menambahkan pasien');
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsEditing(true);
    setIsModalOpen(true);
    reset({
      name: patient.name,
      nik: patient.nik,
      medicalRecordNumber: patient.medicalRecordNumber,
      birthDate: patient.birthDate,
      gender: patient.gender,
      address: patient.address,
      phoneNumber: patient.phoneNumber,
      insurance: patient.insurance,
      occupation: patient.occupation,
      education: patient.education,
      maritalStatus: patient.maritalStatus,
      incomeRange: patient.incomeRange,
      hobbies: patient.hobbies,
    });
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'patients', patientToDelete));
      toast.success('Data pasien berhasil dihapus');
      setIsDeleteModalOpen(false);
      setPatientToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${patientToDelete}`);
      toast.error('Gagal menghapus data pasien');
    }
  };

  const confirmDelete = (id: string) => {
    setPatientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.nik.includes(searchTerm) ||
    patient.medicalRecordNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Data <span className="text-pop-blue">Pasien</span></h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Kelola informasi identitas dan sosial pasien secara terpusat.</p>
        </div>
        <Button onClick={() => {
          setIsEditing(false);
          setEditingPatient(null);
          reset({ gender: 'male' });
          setIsModalOpen(true);
        }} className="bg-pop-pink text-white hover:bg-pop-purple px-10 py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-pop-pink/30 border-none transition-all hover:scale-105 active:scale-95">
          <UserPlus className="mr-3 h-5 w-5" />
          Tambah Pasien Baru
        </Button>
      </div>

      <Card className="border-2 border-gray-100 bg-pop-card rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
        <div className="p-10 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-pop-blue" />
              <Input
                placeholder="Cari berdasarkan Nama, NIK, atau No. RM..."
                className="pl-16 h-16 bg-white border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-pop-blue focus:border-pop-blue/50 text-pop-text font-bold uppercase tracking-widest text-xs transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="h-14 px-8 flex items-center space-x-3 rounded-2xl border-2 border-gray-100 hover:border-pop-blue hover:text-pop-blue bg-white font-black uppercase tracking-widest text-[10px] transition-all shadow-sm">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
              <Button variant="outline" className="h-14 px-8 rounded-2xl border-2 border-gray-100 font-black uppercase tracking-widest text-[10px] hover:border-pop-pink hover:text-pop-pink bg-white transition-all shadow-sm">Export Data</Button>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b-2 border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">No. RM</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Identitas Pasien</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">NIK</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Gender / Usia</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Status</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center space-y-6">
                        <div className="h-12 w-12 border-4 border-pop-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">Memuat data pasien...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="group hover:bg-pop-blue/5 transition-all duration-300">
                      <td className="px-10 py-8 whitespace-nowrap">
                        <span className="px-4 py-2 bg-pop-blue/10 text-pop-blue rounded-xl text-[10px] font-black tracking-[0.2em] border-2 border-pop-blue/20 uppercase italic">
                          {patient.medicalRecordNumber}
                        </span>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <div className="flex items-center space-x-6">
                          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black text-xl group-hover:bg-pop-blue group-hover:text-white group-hover:rotate-3 transition-all duration-500 shadow-sm">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-lg font-black text-pop-text uppercase italic tracking-tight">{patient.name}</div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{patient.phoneNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap text-sm text-gray-500 font-black uppercase tracking-tight italic">{patient.nik}</td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <div className="text-sm text-pop-text font-black uppercase italic tracking-tight">{patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{patient.birthDate}</div>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <Badge className={cn(
                          "rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-2",
                          patient.insurance === 'BPJS' ? 'bg-pop-green/10 text-pop-green border-pop-green/30' : 'bg-pop-blue/10 text-pop-blue border-pop-blue/30'
                        )}>
                          {patient.insurance || 'Umum'}
                        </Badge>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Button variant="ghost" size="icon" title="Rekam Medis" onClick={() => fetchRecords(patient)} className="h-12 w-12 rounded-xl hover:bg-pop-blue/10 hover:text-pop-blue text-gray-400 border-2 border-transparent hover:border-pop-blue/30 transition-all">
                            <FileText className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => handleEdit(patient)} className="h-12 w-12 rounded-xl hover:bg-pop-yellow/10 hover:text-pop-yellow text-gray-400 border-2 border-transparent hover:border-pop-yellow/30 transition-all">
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Hapus" onClick={() => confirmDelete(patient.id)} className="h-12 w-12 rounded-xl hover:bg-pop-pink/10 hover:text-pop-pink text-gray-400 border-2 border-transparent hover:border-pop-pink/30 transition-all">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center space-y-6">
                        <div className="h-24 w-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border-2 border-gray-100">
                          <Search className="h-12 w-12 text-gray-200" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Pasien tidak ditemukan</h3>
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs mx-auto">Coba gunakan kata kunci lain atau tambahkan pasien baru jika belum terdaftar.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-10 py-8 flex items-center justify-between border-t-2 border-gray-100 bg-gray-50/50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">
              Total <span className="text-pop-blue">{filteredPatients.length}</span> Pasien Terdaftar
            </p>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" disabled className="rounded-xl h-12 w-12 p-0 border-2 border-gray-100 text-gray-300 bg-white shadow-sm">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" disabled className="rounded-xl h-12 w-12 p-0 border-2 border-gray-100 text-gray-300 bg-white shadow-sm">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsEditing(false);
          setEditingPatient(null);
        }} 
        title={isEditing ? "Edit Data Pasien" : "Tambah Pasien Baru"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Nama Lengkap</label>
              <Input {...register('name')} placeholder="Masukkan nama lengkap" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
              {errors.name && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.name.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">NIK (16 Digit)</label>
              <Input {...register('nik')} placeholder="Masukkan 16 digit NIK" maxLength={16} className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
              {errors.nik && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.nik.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">No. Rekam Medis</label>
              <Input {...register('medicalRecordNumber')} placeholder="Contoh: RM-001" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
              {errors.medicalRecordNumber && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.medicalRecordNumber.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Tanggal Lahir</label>
              <Input {...register('birthDate')} type="date" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
              {errors.birthDate && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.birthDate.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Jenis Kelamin</label>
              <select {...register('gender')} className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs outline-none appearance-none">
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">No. HP</label>
              <Input {...register('phoneNumber')} placeholder="Contoh: 08123456789" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
              {errors.phoneNumber && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.phoneNumber.message}</p>}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Alamat Lengkap</label>
            <textarea {...register('address')} placeholder="Masukkan alamat lengkap" rows={3} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs outline-none resize-none" />
            {errors.address && <p className="text-[10px] text-pop-pink font-black uppercase tracking-widest ml-2">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Asuransi / BPJS</label>
              <Input {...register('insurance')} placeholder="Contoh: BPJS, Mandiri, Umum" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Pekerjaan</label>
              <Input {...register('occupation')} placeholder="Masukkan pekerjaan" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Range Pendapatan</label>
              <select {...register('incomeRange')} className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs outline-none appearance-none">
                <option value="">Pilih Range Pendapatan</option>
                <option value="< 1 Juta">{"< 1 Juta"}</option>
                <option value="1 - 3 Juta">1 - 3 Juta</option>
                <option value="3 - 5 Juta">3 - 5 Juta</option>
                <option value="5 - 10 Juta">5 - 10 Juta</option>
                <option value="> 10 Juta">{"> 10 Juta"}</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Hobi / Aktivitas Rekreasi</label>
              <Input {...register('hobbies')} placeholder="Contoh: Berenang, Membaca" className="h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-xs" />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-8">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="px-10 py-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100">
              Batal
            </Button>
            <Button type="submit" className="bg-pop-blue text-white hover:bg-pop-purple px-10 py-8 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-pop-blue/30 border-none transition-all hover:scale-105 active:scale-95" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pasien'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus"
        className="max-w-md"
      >
        <div className="space-y-8 p-6">
          <div className="flex items-center space-x-6 text-pop-pink bg-pop-pink/5 p-8 rounded-[2rem] border-2 border-pop-pink/20 shadow-lg shadow-pop-pink/10">
            <div className="bg-white p-4 rounded-2xl border-2 border-pop-pink shadow-md">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <p className="text-sm font-black uppercase tracking-tight italic leading-relaxed">Tindakan ini tidak dapat dibatalkan. Semua data terkait pasien ini akan dihapus secara permanen.</p>
          </div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs text-center italic">Apakah Anda yakin ingin menghapus data pasien ini?</p>
          <div className="flex justify-center space-x-4 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 border-2 border-gray-100 shadow-sm">Batal</Button>
            <Button onClick={handleDelete} className="bg-rose-500 text-white hover:bg-rose-600 px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/30 border-none transition-all hover:scale-105 active:scale-95">Hapus Permanen</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRecordsModalOpen}
        onClose={() => setIsRecordsModalOpen(false)}
        title={`Riwayat Rekam Medis: ${selectedPatient?.name}`}
        className="max-w-3xl"
      >
        <div className="space-y-8 p-6">
          {isLoadingRecords ? (
            <div className="text-center py-20">
              <div className="h-12 w-12 border-4 border-pop-blue border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">Memuat riwayat rekam medis...</p>
            </div>
          ) : patientRecords.length > 0 ? (
            <div className="space-y-6">
              {patientRecords.map((record) => (
                <Card key={record.id} className="border-2 border-gray-100 bg-white rounded-[2.5rem] overflow-hidden hover:border-pop-blue/30 transition-all duration-300 shadow-sm group">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4 text-sm font-black text-pop-text uppercase italic tracking-tight">
                        <div className="bg-pop-blue/10 p-3 rounded-xl border-2 border-pop-blue/20 group-hover:bg-pop-blue group-hover:text-white transition-all">
                          <Clock className="h-5 w-5" />
                        </div>
                        <span>{new Date(record.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <Badge className="bg-pop-purple/10 text-pop-purple border-2 border-pop-purple/30 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                        DMF-T: {record.indices?.dmft?.d + record.indices?.dmft?.m + record.indices?.dmft?.f}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                        <p className="font-black text-pop-blue uppercase tracking-widest text-[10px] mb-2 italic">Keluhan Utama:</p>
                        <p className="text-gray-500 font-bold leading-relaxed">{record.anamnesis?.mainComplaint}</p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                        <p className="font-black text-pop-pink uppercase tracking-widest text-[10px] mb-2 italic">Diagnosis:</p>
                        <p className="text-gray-500 font-bold leading-relaxed">{record.diagnosis}</p>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '#medical-record'} className="px-8 py-6 rounded-2xl border-2 border-gray-100 hover:border-pop-blue hover:text-pop-blue bg-white font-black uppercase tracking-widest text-[10px] transition-all shadow-sm">
                        Detail Lengkap
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="h-20 w-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-gray-100">
                <FileText className="h-10 w-10 text-gray-200" />
              </div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">Belum ada riwayat rekam medis untuk pasien ini.</p>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
