/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  User,
  Heart,
  Stethoscope
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { db, collection, query, where, onSnapshot, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile, Patient, Appointment } from '../types';
import { Badge } from './ui/Badge';

interface PatientDashboardProps {
  userProfile: UserProfile;
}

export function PatientDashboard({ userProfile }: PatientDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userProfile.patientId) {
      // Fetch patient data
      const patientUnsubscribe = onSnapshot(
        doc(db, 'patients', userProfile.patientId),
        (doc) => {
          if (doc.exists()) {
            setPatientData({ id: doc.id, ...doc.data() } as Patient);
          }
          setIsLoading(false);
        },
        (error) => handleFirestoreError(error, OperationType.GET, `patients/${userProfile.patientId}`)
      );

      // Fetch upcoming appointments
      const q = query(
        collection(db, 'appointments'),
        where('patientId', '==', userProfile.patientId),
        where('status', '==', 'scheduled')
      );

      const appointmentsUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          setAppointments(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'appointments')
      );

      return () => {
        patientUnsubscribe();
        appointmentsUnsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, [userProfile.patientId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="h-16 w-16 border-4 border-pop-blue border-t-transparent rounded-full animate-spin shadow-lg shadow-pop-blue/20" />
        <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] italic">Memuat data Anda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Halo, <span className="text-pop-blue">{userProfile.displayName}</span></h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Selamat datang di portal pasien <span className="text-pop-pink">DentaCare</span>.</p>
        </div>
        <div className="flex items-center space-x-3 bg-pop-card p-4 rounded-2xl border-2 border-gray-100 shadow-xl">
          <Calendar className="h-5 w-5 text-pop-blue" />
          <span className="text-xs font-black text-pop-text uppercase tracking-widest">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {!userProfile.patientId ? (
        <Card className="border-2 border-pop-pink/30 bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-pop-pink/10">
          <CardContent className="p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="h-32 w-32 bg-pop-pink/10 rounded-[2.5rem] flex items-center justify-center text-pop-pink border-2 border-pop-pink/20 shrink-0">
              <AlertCircle className="h-16 w-16" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <h2 className="text-3xl font-black text-pop-text uppercase italic tracking-tight">Akun Belum Terhubung</h2>
              <p className="text-gray-500 font-medium leading-relaxed max-w-xl">
                Anda belum menghubungkan akun ini dengan data pasien DentaCare. Silakan lakukan pendaftaran pasien baru atau hubungkan dengan data pasien lama Anda.
              </p>
              <div className="pt-4">
                <Button 
                  onClick={() => window.location.hash = '#registration'}
                  variant="primary" 
                  className="px-10 py-8 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-pop-blue/20"
                >
                  Daftar Sekarang <ArrowRight className="h-5 w-5 ml-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-gray-100 bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
              <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Jadwal Mendatang</CardTitle>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Janji Temu Anda Berikutnya</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-pop-blue/5 flex items-center justify-center text-pop-blue border-2 border-pop-blue/10">
                  <Calendar className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {appointments.length > 0 ? (
                    appointments.map((appointment) => (
                      <div key={appointment.id} className="p-10 flex items-center justify-between hover:bg-gray-50 transition-all">
                        <div className="flex items-center space-x-6">
                          <div className="h-16 w-16 rounded-2xl bg-pop-green/10 flex items-center justify-center text-pop-green border-2 border-pop-green/20">
                            <Stethoscope className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-pop-text uppercase italic tracking-tight">Pemeriksaan Gigi Rutin</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center space-x-2 text-gray-400">
                                <Calendar className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{appointment.date}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{appointment.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant="success" className="px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border-2 border-pop-green/30">Terjadwal</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-20 text-center space-y-6">
                      <div className="h-20 w-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-gray-100">
                        <Calendar className="h-10 w-10 text-gray-200" />
                      </div>
                      <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] italic">Belum Ada Jadwal</p>
                      <Button variant="outline" className="rounded-2xl border-pop-blue text-pop-blue hover:bg-pop-blue/5 font-black uppercase tracking-widest text-[10px] px-8">
                        Buat Janji Temu
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 border-gray-100 bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50 group hover:border-pop-blue/30 transition-all">
                <CardContent className="p-10 space-y-6">
                  <div className="h-16 w-16 bg-pop-blue/10 rounded-2xl flex items-center justify-center text-pop-blue border-2 border-pop-blue/20 group-hover:scale-110 transition-transform">
                    <ClipboardList className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Riwayat Medis</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed uppercase tracking-widest">Lihat catatan pemeriksaan dan diagnosa Anda sebelumnya.</p>
                  </div>
                  <Button variant="ghost" className="w-full justify-between text-pop-blue font-black uppercase tracking-widest text-[10px] p-0 hover:bg-transparent">
                    Lihat Riwayat <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-100 bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50 group hover:border-pop-pink/30 transition-all">
                <CardContent className="p-10 space-y-6">
                  <div className="h-16 w-16 bg-pop-pink/10 rounded-2xl flex items-center justify-center text-pop-pink border-2 border-pop-pink/20 group-hover:scale-110 transition-transform">
                    <Heart className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Tips Kesehatan</h3>
                    <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed uppercase tracking-widest">Informasi cara menjaga kesehatan gigi dan mulut setiap hari.</p>
                  </div>
                  <Button variant="ghost" className="w-full justify-between text-pop-pink font-black uppercase tracking-widest text-[10px] p-0 hover:bg-transparent">
                    Baca Tips <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-2 border-pop-blue/30 bg-pop-blue/5 rounded-[3rem] overflow-hidden shadow-xl shadow-pop-blue/10">
              <CardHeader className="p-10 pb-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-pop-blue italic">Profil Pasien</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-pop-blue font-black text-xl border-2 border-pop-blue/20 shadow-lg">
                    {patientData?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-pop-text uppercase italic">{patientData?.name}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">No. RM: {patientData?.medicalRecordNumber}</p>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-pop-blue/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIK</span>
                    <span className="text-xs font-bold text-pop-text">{patientData?.nik}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asuransi</span>
                    <span className="text-xs font-bold text-pop-blue">{patientData?.insurance}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => window.location.hash = '#registration'}
                  className="w-full bg-pop-blue text-white hover:bg-pop-purple py-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-pop-blue/20"
                >
                  Lihat Detail Profil
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 bg-white rounded-[3rem] overflow-hidden shadow-sm">
              <CardHeader className="p-10 pb-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Bantuan</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-0">
                <div className="p-6 bg-gray-50 rounded-2xl border-2 border-gray-100">
                  <p className="text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-widest">
                    Butuh bantuan atau ingin membatalkan janji temu? Hubungi kami di:
                  </p>
                  <p className="text-sm font-black text-pop-blue mt-4 italic tracking-tight">021-1234-5678</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Add missing import for doc
import { doc } from 'firebase/firestore';
