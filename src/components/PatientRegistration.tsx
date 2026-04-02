/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  User,
  Fingerprint,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Select } from './ui/Select';
import { db, collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, OperationType, handleFirestoreError } from '../firebase';
import { Patient, UserProfile } from '../types';
import { toast } from 'sonner';

interface PatientRegistrationProps {
  userProfile: UserProfile;
}

export function PatientRegistration({ userProfile }: PatientRegistrationProps) {
  const [mode, setMode] = useState<'selection' | 'new' | 'existing'>('selection');
  const [isLoading, setIsLoading] = useState(false);
  const [linkedPatient, setLinkedPatient] = useState<Patient | null>(null);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: userProfile.displayName,
    nik: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female',
    address: '',
    phoneNumber: '',
    insurance: 'Umum',
    occupation: '',
    education: '',
    maritalStatus: 'Belum Kawin',
    incomeRange: '',
    hobbies: ''
  });

  // Existing patient search
  const [searchNik, setSearchNik] = useState('');
  const [searchMRN, setSearchMRN] = useState('');

  useEffect(() => {
    if (userProfile.patientId) {
      fetchLinkedPatient(userProfile.patientId);
    }
  }, [userProfile.patientId]);

  const fetchLinkedPatient = async (patientId: string) => {
    setIsLoading(true);
    try {
      const patientDoc = await getDocs(query(collection(db, 'patients'), where('id', '==', patientId)));
      if (!patientDoc.empty) {
        setLinkedPatient({ id: patientDoc.docs[0].id, ...patientDoc.docs[0].data() } as Patient);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `patients/${patientId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Create Patient Document
      const mrn = `MRN-${Math.floor(100000 + Math.random() * 900000)}`;
      const patientData = {
        ...newPatient,
        medicalRecordNumber: mrn,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'patients'), patientData);
      const patientId = docRef.id;
      
      // 2. Update User Profile with patientId
      await updateDoc(doc(db, 'users', userProfile.uid), {
        patientId: patientId,
        updatedAt: Timestamp.now()
      });

      toast.success('Pendaftaran pasien baru berhasil!');
      setLinkedPatient({ id: patientId, ...patientData } as Patient);
      setMode('selection');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'patients');
      toast.error('Gagal melakukan pendaftaran');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'patients'), 
        where('nik', '==', searchNik),
        where('medicalRecordNumber', '==', searchMRN)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Data pasien tidak ditemukan. Pastikan NIK dan No. Rekam Medis benar.');
      } else {
        const patientData = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userProfile.uid), {
          patientId: patientData.id,
          updatedAt: Timestamp.now()
        });
        toast.success('Akun berhasil dihubungkan dengan data pasien lama');
        setLinkedPatient({ id: patientData.id, ...patientData.data() } as Patient);
        setMode('selection');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'patients');
      toast.error('Gagal mencari data pasien');
    } finally {
      setIsLoading(false);
    }
  };

  if (linkedPatient) {
    return (
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-6 bg-pop-green/10 rounded-[2.5rem] border-2 border-pop-green/20 mb-4">
            <CheckCircle2 className="h-12 w-12 text-pop-green" />
          </div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Status <span className="text-pop-green">Terdaftar</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">Akun Anda telah terhubung dengan rekam medis di DentaCare.</p>
        </div>

        <Card className="border-2 border-gray-100 bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="h-20 w-20 rounded-3xl bg-pop-blue flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-pop-blue/20">
                  {linkedPatient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-pop-text uppercase italic tracking-tight">{linkedPatient.name}</h2>
                  <p className="text-pop-blue font-bold uppercase tracking-widest text-xs mt-1">No. RM: {linkedPatient.medicalRecordNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Pasien</p>
                <div className="flex items-center space-x-2 text-pop-green">
                  <Fingerprint className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-widest italic">Terverifikasi</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NIK</p>
                    <p className="font-bold text-pop-text">{linkedPatient.nik}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Lahir</p>
                    <p className="font-bold text-pop-text">{linkedPatient.birthDate}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">No. Telepon</p>
                    <p className="font-bold text-pop-text">{linkedPatient.phoneNumber}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat</p>
                    <p className="font-bold text-pop-text leading-relaxed">{linkedPatient.address}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Asuransi</p>
                    <p className="font-bold text-pop-blue">{linkedPatient.insurance}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-pop-blue/5 p-8 rounded-[2.5rem] border-2 border-pop-blue/10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-pop-blue rounded-2xl text-white shadow-lg shadow-pop-blue/20">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-pop-text uppercase italic tracking-tight">Butuh Perubahan Data?</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Silakan hubungi petugas administrasi di klinik.</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl border-pop-blue text-pop-blue hover:bg-pop-blue/10 font-black uppercase tracking-widest text-[10px] px-8 h-14">
            Hubungi Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Pendaftaran <span className="text-pop-blue">Pasien</span></h1>
        <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">Silakan pilih jenis pendaftaran untuk melanjutkan.</p>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <button 
              onClick={() => setMode('new')}
              className="group bg-white p-10 rounded-[3rem] border-2 border-gray-100 hover:border-pop-pink transition-all duration-500 text-left shadow-xl hover:shadow-2xl hover:shadow-pop-pink/10 relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-pop-pink/5 rounded-full blur-3xl group-hover:bg-pop-pink/10 transition-colors" />
              <div className="h-20 w-20 bg-pop-pink/10 rounded-[2rem] flex items-center justify-center text-pop-pink mb-8 group-hover:scale-110 transition-transform duration-500">
                <UserPlus className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-black text-pop-text uppercase italic tracking-tight mb-4">Pasien Baru</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-8">Belum pernah berkunjung ke klinik DentaCare sebelumnya.</p>
              <div className="flex items-center text-pop-pink font-black uppercase tracking-widest text-[10px]">
                Daftar Sekarang <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => setMode('existing')}
              className="group bg-white p-10 rounded-[3rem] border-2 border-gray-100 hover:border-pop-blue transition-all duration-500 text-left shadow-xl hover:shadow-2xl hover:shadow-pop-blue/10 relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-pop-blue/5 rounded-full blur-3xl group-hover:bg-pop-blue/10 transition-colors" />
              <div className="h-20 w-20 bg-pop-blue/10 rounded-[2rem] flex items-center justify-center text-pop-blue mb-8 group-hover:scale-110 transition-transform duration-500">
                <Search className="h-10 w-10" />
              </div>
              <h3 className="text-3xl font-black text-pop-text uppercase italic tracking-tight mb-4">Pasien Lama</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-8">Sudah memiliki nomor rekam medis di klinik DentaCare.</p>
              <div className="flex items-center text-pop-blue font-black uppercase tracking-widest text-[10px]">
                Hubungkan Akun <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          </motion.div>
        )}

        {mode === 'new' && (
          <motion.div
            key="new"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="border-2 border-gray-100 bg-white shadow-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black text-pop-text uppercase italic tracking-tight">Form Pasien Baru</CardTitle>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Lengkapi data diri Anda sesuai KTP/Identitas.</p>
                </div>
                <Button variant="ghost" onClick={() => setMode('selection')} className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Kembali</Button>
              </CardHeader>
              <CardContent className="p-10">
                <form onSubmit={handleNewRegistration} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Nama Lengkap</label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink" />
                        <Input 
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          value={newPatient.name}
                          onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">NIK (16 Digit)</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink" />
                        <Input 
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          placeholder="3201xxxxxxxxxxxx"
                          value={newPatient.nik}
                          onChange={(e) => setNewPatient({...newPatient, nik: e.target.value})}
                          maxLength={16}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Tanggal Lahir</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink" />
                        <Input 
                          type="date"
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          value={newPatient.birthDate}
                          onChange={(e) => setNewPatient({...newPatient, birthDate: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Jenis Kelamin</label>
                      <Select 
                        className="py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                        value={newPatient.gender}
                        onChange={(e) => setNewPatient({...newPatient, gender: e.target.value as 'male' | 'female'})}
                      >
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">No. Telepon</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-pink" />
                        <Input 
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          placeholder="08xxxxxxxxxx"
                          value={newPatient.phoneNumber}
                          onChange={(e) => setNewPatient({...newPatient, phoneNumber: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Asuransi</label>
                      <Select 
                        className="py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                        value={newPatient.insurance}
                        onChange={(e) => setNewPatient({...newPatient, insurance: e.target.value})}
                      >
                        <option value="Umum">Umum / Mandiri</option>
                        <option value="BPJS">BPJS Kesehatan</option>
                        <option value="Asuransi Swasta">Asuransi Swasta</option>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Range Pendapatan</label>
                      <Select 
                        className="py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                        value={newPatient.incomeRange}
                        onChange={(e) => setNewPatient({...newPatient, incomeRange: e.target.value})}
                      >
                        <option value="">Pilih Range Pendapatan</option>
                        <option value="< 1 Juta">{"< 1 Juta"}</option>
                        <option value="1 - 3 Juta">1 - 3 Juta</option>
                        <option value="3 - 5 Juta">3 - 5 Juta</option>
                        <option value="5 - 10 Juta">5 - 10 Juta</option>
                        <option value="> 10 Juta">{"> 10 Juta"}</option>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Hobi / Aktivitas Rekreasi</label>
                      <Input 
                        className="py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                        placeholder="Contoh: Berenang, Membaca"
                        value={newPatient.hobbies}
                        onChange={(e) => setNewPatient({...newPatient, hobbies: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Alamat Lengkap</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-8 h-5 w-5 text-pop-pink" />
                      <textarea 
                        className="w-full pl-14 py-6 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text min-h-[120px] focus:border-pop-blue outline-none transition-all"
                        placeholder="Jl. Raya No. 123, Kota..."
                        value={newPatient.address}
                        onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="w-full py-10 rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-pop-blue/20"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Memproses...' : 'Daftar Sebagai Pasien Baru'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'existing' && (
          <motion.div
            key="existing"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="border-2 border-gray-100 bg-white shadow-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black text-pop-text uppercase italic tracking-tight">Hubungkan Data Pasien</CardTitle>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Masukkan data identitas Anda yang terdaftar di klinik.</p>
                </div>
                <Button variant="ghost" onClick={() => setMode('selection')} className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Kembali</Button>
              </CardHeader>
              <CardContent className="p-10">
                <form onSubmit={handleExistingLink} className="space-y-10">
                  <div className="p-8 bg-pop-blue/5 rounded-[2rem] border-2 border-pop-blue/10 flex items-start space-x-4">
                    <AlertCircle className="h-6 w-6 text-pop-blue mt-1" />
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Untuk keamanan data, Anda harus memasukkan NIK dan Nomor Rekam Medis yang tepat untuk menghubungkan akun ini dengan data pasien lama.
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">NIK Pasien</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-blue" />
                        <Input 
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          placeholder="3201xxxxxxxxxxxx"
                          value={searchNik}
                          onChange={(e) => setSearchNik(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Nomor Rekam Medis (MRN)</label>
                      <div className="relative">
                        <ClipboardList className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-pop-blue" />
                        <Input 
                          className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-pop-text"
                          placeholder="MRN-xxxxxx"
                          value={searchMRN}
                          onChange={(e) => setSearchMRN(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="w-full py-10 rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-pop-blue/20"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Mencari Data...' : 'Hubungkan Data Pasien'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
