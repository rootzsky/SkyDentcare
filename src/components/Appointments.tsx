/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { cn } from '@/src/lib/utils';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, OperationType, handleFirestoreError, Timestamp } from '../firebase';
import { Appointment, Patient } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Pilih pasien'),
  date: z.string().min(1, 'Pilih tanggal'),
  time: z.string().min(1, 'Pilih waktu'),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    const patientsUnsubscribe = onSnapshot(
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

    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '==', selectedDate)
    );

    const appointmentsUnsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const appointmentList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        setAppointments(appointmentList);
        setIsLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'appointments')
    );

    return () => {
      patientsUnsubscribe();
      appointmentsUnsubscribe();
    };
  }, [selectedDate]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const selectedPatient = patients.find(p => p.id === data.patientId);
      if (!selectedPatient) throw new Error('Pasien tidak ditemukan');

      if (isEditing && editingAppointment) {
        const aptRef = doc(db, 'appointments', editingAppointment.id);
        await updateDoc(aptRef, {
          ...data,
          patientName: selectedPatient.name,
          updatedAt: Timestamp.now(),
        });
        toast.success('Janji temu berhasil diperbarui');
      } else {
        const newAppointment = {
          ...data,
          patientName: selectedPatient.name,
          status: 'scheduled',
          dentistId: 'default', // Placeholder
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, 'appointments'), newAppointment);
        toast.success('Janji temu berhasil dibuat');
      }
      setIsModalOpen(false);
      reset();
      setIsEditing(false);
      setEditingAppointment(null);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'appointments');
      toast.error(isEditing ? 'Gagal memperbarui janji temu' : 'Gagal membuat janji temu');
    }
  };

  const handleEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setIsEditing(true);
    setIsModalOpen(true);
    reset({
      patientId: apt.patientId,
      date: apt.date,
      time: apt.time,
      notes: apt.notes,
    });
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const aptRef = doc(db, 'appointments', id);
      await updateDoc(aptRef, { status, updatedAt: Timestamp.now() });
      toast.success(`Status janji temu diperbarui menjadi ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
      toast.error('Gagal memperbarui status');
    }
  };

  const handleDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      await deleteDoc(doc(db, 'appointments', appointmentToDelete));
      toast.success('Janji temu berhasil dihapus');
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${appointmentToDelete}`);
      toast.error('Gagal menghapus janji temu');
    }
  };

  const confirmDelete = (id: string) => {
    setAppointmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Penjadwalan <span className="text-pop-blue">Pasien</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Atur janji temu dan kelola antrian pasien secara efisien.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="flex items-center space-x-3 px-8 py-8 rounded-[2rem] shadow-xl shadow-pop-blue/20 hover:scale-105 transition-transform group">
          <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
          <span className="font-black uppercase tracking-widest text-sm">Buat Janji Temu</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-4 border-2 border-gray-100 bg-pop-card shadow-2xl shadow-gray-200/50 rounded-[3rem] overflow-hidden h-fit sticky top-8">
          <CardHeader className="bg-gray-50/30 border-b border-gray-100 p-10">
            <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight flex items-center">
              <CalendarIcon className="h-6 w-6 mr-3 text-pop-blue" />
              Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <div className="space-y-8">
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-8 bg-white border-2 border-gray-100 focus:border-pop-blue rounded-[2rem] font-black text-pop-text uppercase tracking-widest text-xs shadow-inner"
              />
              <div className="p-8 bg-pop-blue/5 rounded-[2.5rem] border-2 border-pop-blue/10 shadow-lg shadow-pop-blue/5">
                <p className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em] mb-3 italic">Informasi</p>
                <p className="text-xs text-gray-500 font-bold leading-relaxed uppercase tracking-widest">
                  Menampilkan semua jadwal kunjungan pasien untuk tanggal yang Anda pilih di atas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                Jadwal Kunjungan
              </CardTitle>
              <Badge variant="outline" className="bg-pop-blue/10 text-pop-blue border-pop-blue/20 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">
                {appointments.length} Janji Temu
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-32 text-center">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="h-12 w-12 border-4 border-pop-blue border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,212,255,0.2)]" />
                    <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] italic">Memuat jadwal...</p>
                  </div>
                </div>
              ) : appointments.length > 0 ? (
                appointments.map((apt) => (
                  <div key={apt.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-8 hover:bg-gray-50/50 transition-all duration-300 gap-6">
                    <div className="flex items-center space-x-6">
                      <div className="flex flex-col items-center justify-center w-20 h-20 bg-white rounded-[2rem] border-2 border-gray-100 group-hover:border-pop-blue/30 transition-all duration-500 shadow-lg shadow-gray-200/50">
                        <Clock className="h-5 w-5 text-pop-blue mb-1" />
                        <span className="text-xs font-black text-pop-text uppercase tracking-widest">{apt.time}</span>
                      </div>
                      <div>
                        <p className="font-black text-pop-text text-xl tracking-tight uppercase italic group-hover:text-pop-blue transition-colors">{apt.patientName}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">{apt.notes || 'Pemeriksaan Umum'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-6">
                      <Badge 
                        className={cn(
                          "px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border-2",
                          apt.status === 'completed' ? 'bg-pop-green/10 text-pop-green border-pop-green/20' : 
                          apt.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                          'bg-pop-blue/10 text-pop-blue border-pop-blue/20'
                        )}
                      >
                        {apt.status === 'completed' ? 'Selesai' : 
                         apt.status === 'cancelled' ? 'Dibatalkan' : 'Terjadwal'}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(apt)} className="h-11 w-11 rounded-2xl hover:bg-amber-500/10 hover:text-amber-500 border-2 border-transparent hover:border-amber-500/20 transition-all">
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(apt.id)} className="h-11 w-11 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 border-2 border-transparent hover:border-rose-500/20 transition-all">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                        <div className="relative group/menu">
                          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl hover:bg-gray-100 text-gray-400 border-2 border-transparent hover:border-gray-200">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                          <div className="absolute right-0 mt-3 w-56 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                            <button 
                              onClick={() => handleStatusUpdate(apt.id, 'completed')}
                              className="w-full text-left px-6 py-4 text-[10px] font-black text-pop-green hover:bg-pop-green/10 flex items-center uppercase tracking-widest border-b border-gray-100 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-4" /> Tandai Selesai
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                              className="w-full text-left px-6 py-4 text-[10px] font-black text-rose-500 hover:bg-rose-500/10 flex items-center uppercase tracking-widest transition-colors"
                            >
                              <XCircle className="h-4 w-4 mr-4" /> Batalkan
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-32 text-center">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="h-24 w-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border-2 border-gray-100 shadow-lg shadow-gray-200/50">
                      <CalendarIcon className="h-12 w-12 text-gray-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-pop-text uppercase italic tracking-tight">Tidak ada jadwal</h3>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3 max-w-xs mx-auto">Belum ada janji temu yang terdaftar untuk tanggal {selectedDate}.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus"
        className="max-w-md bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl"
      >
        <div className="space-y-8 p-4">
          <div className="flex items-center space-x-5 text-rose-500 bg-rose-500/5 p-6 rounded-2xl border-2 border-rose-500/10">
            <AlertTriangle className="h-8 w-8 shrink-0" />
            <p className="text-xs font-black uppercase tracking-widest leading-relaxed italic">Apakah Anda yakin ingin menghapus janji temu ini?</p>
          </div>
          <div className="flex justify-end space-x-4">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="px-8 py-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 hover:bg-gray-50">Batal</Button>
            <Button variant="danger" onClick={handleDelete} className="px-8 py-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-500/20">Hapus</Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsEditing(false);
          setEditingAppointment(null);
        }} 
        title={isEditing ? "Edit Janji Temu" : "Buat Janji Temu Baru"}
        className="max-w-2xl bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Pilih Pasien</label>
            <Select {...register('patientId')} className="py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs">
              <option value="" className="bg-white">-- Pilih Pasien --</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id} className="bg-white">
                  {patient.name} ({patient.medicalRecordNumber})
                </option>
              ))}
            </Select>
            {errors.patientId && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.patientId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Tanggal</label>
              <Input {...register('date')} type="date" className="py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs" />
              {errors.date && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.date.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Waktu</label>
              <Input {...register('time')} type="time" className="py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs" />
              {errors.time && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Catatan / Keluhan</label>
            <Input {...register('notes')} placeholder="Contoh: Sakit gigi geraham" className="py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs" />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="px-8 py-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 hover:bg-gray-50">
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="px-10 py-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Janji Temu'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
