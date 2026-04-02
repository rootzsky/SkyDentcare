/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Signature, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search,
  Calendar as CalendarIcon,
  User,
  Stethoscope,
  Trash2,
  Download,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { db, collection, onSnapshot, addDoc, doc, OperationType, handleFirestoreError, Timestamp } from '../firebase';
import { InformedConsent as InformedConsentType, Patient } from '../types';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { TOOTH_NUMBERS } from '../constants';
import { cn } from '@/src/lib/utils';

export function InformedConsent() {
  const [consents, setConsents] = useState<InformedConsentType[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [isAgreed, setIsAgreed] = useState(true);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  const patientSigRef = useRef<SignatureCanvas>(null);
  const doctorSigRef = useRef<SignatureCanvas>(null);

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

    const consentsUnsubscribe = onSnapshot(
      collection(db, 'informed_consents'),
      (snapshot) => {
        const consentList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InformedConsentType[];
        setConsents(consentList.sort((a, b) => 
          new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
        ));
        setIsLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'informed_consents')
    );

    return () => {
      patientsUnsubscribe();
      consentsUnsubscribe();
    };
  }, []);

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth(prev => 
      prev.includes(tooth) ? prev.filter(t => t !== tooth) : [...prev, tooth]
    );
  };

  const clearSignatures = () => {
    patientSigRef.current?.clear();
    doctorSigRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatientId) {
      toast.error('Pilih pasien terlebih dahulu');
      return;
    }

    if (patientSigRef.current?.isEmpty() || doctorSigRef.current?.isEmpty()) {
      toast.error('Tanda tangan pasien dan dokter diperlukan');
      return;
    }

    try {
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      if (!selectedPatient) throw new Error('Pasien tidak ditemukan');

      const newConsent: Omit<InformedConsentType, 'id'> = {
        patientId: selectedPatientId,
        patientName: selectedPatient.name,
        date: new Date().toISOString().split('T')[0],
        procedureName,
        isAgreed,
        siteMarking: selectedTeeth,
        patientSignature: patientSigRef.current?.toDataURL() || '',
        doctorSignature: doctorSigRef.current?.toDataURL() || '',
        notes,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'informed_consents'), newConsent);
      toast.success('Informed Consent berhasil disimpan');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'informed_consents');
      toast.error('Gagal menyimpan Informed Consent');
    }
  };

  const resetForm = () => {
    setSelectedPatientId('');
    setProcedureName('');
    setIsAgreed(true);
    setSelectedTeeth([]);
    setNotes('');
    clearSignatures();
  };

  const filteredConsents = consents.filter(c => 
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.procedureName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderToothGrid = (numbers: number[], label: string) => (
    <div className="space-y-2">
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{label}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {numbers.map(num => (
          <button
            key={num}
            type="button"
            onClick={() => toggleTooth(num.toString())}
            className={cn(
              "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all",
              selectedTeeth.includes(num.toString())
                ? "bg-pop-blue border-pop-blue text-white shadow-lg shadow-pop-blue/20 scale-110"
                : "bg-white border-gray-100 text-gray-300 hover:border-pop-blue/30"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Informed <span className="text-pop-blue">Consent</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Persetujuan atau penolakan tindakan medis oleh pasien.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="flex items-center space-x-3 px-8 py-8 rounded-[2rem] shadow-xl shadow-pop-blue/20 hover:scale-105 transition-transform group">
          <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
          <span className="font-black uppercase tracking-widest text-sm">Buat Informed Consent</span>
        </Button>
      </div>

      <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">Riwayat Persetujuan</CardTitle>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Cari pasien atau tindakan..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 py-7 bg-white border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-[10px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Pasien</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tindakan</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Status</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tanggal</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-10 w-10 border-4 border-pop-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Memuat data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredConsents.length > 0 ? (
                  filteredConsents.map((consent) => (
                    <tr key={consent.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-10 py-8">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-2xl bg-pop-blue/10 flex items-center justify-center border-2 border-pop-blue/20">
                            <User className="h-6 w-6 text-pop-blue" />
                          </div>
                          <div>
                            <p className="font-black text-pop-text uppercase italic tracking-tight">{consent.patientName}</p>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">ID: {consent.patientId.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className="font-black text-pop-text uppercase italic tracking-tight text-sm">{consent.procedureName}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {consent.siteMarking.map(tooth => (
                            <Badge key={tooth} variant="outline" className="text-[8px] px-2 py-0.5 bg-gray-50">Gigi {tooth}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <Badge className={cn(
                          "px-4 py-1 rounded-full font-black text-[8px] uppercase tracking-widest border-2",
                          consent.isAgreed 
                            ? "bg-pop-green/10 text-pop-green border-pop-green/20" 
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}>
                          {consent.isAgreed ? 'Persetujuan' : 'Penolakan'}
                        </Badge>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center text-gray-400">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{consent.date}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-pop-blue/10 hover:text-pop-blue border-2 border-transparent hover:border-pop-blue/20">
                            <Printer className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100 border-2 border-transparent hover:border-gray-200">
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                      <div className="flex flex-col items-center space-y-4 opacity-30">
                        <FileText className="h-16 w-16 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tidak ada data informed consent</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Form Informed Consent"
        className="max-w-4xl bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Pilih Pasien</label>
              <Select 
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px]"
              >
                <option value="">-- Pilih Pasien --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.medicalRecordNumber})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Nama Tindakan</label>
              <Input 
                required
                placeholder="Contoh: Ekstraksi Gigi Geraham"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px]"
              />
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Pernyataan Sikap</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsAgreed(true)}
                className={cn(
                  "p-6 rounded-3xl border-2 flex flex-col items-center space-y-3 transition-all",
                  isAgreed 
                    ? "bg-pop-green/10 border-pop-green shadow-lg shadow-pop-green/10 scale-[1.02]" 
                    : "bg-white border-gray-100 opacity-50 hover:opacity-100"
                )}
              >
                <CheckCircle2 className={cn("h-8 w-8", isAgreed ? "text-pop-green" : "text-gray-300")} />
                <span className={cn("text-xs font-black uppercase tracking-widest", isAgreed ? "text-pop-green" : "text-gray-400")}>Setuju</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAgreed(false)}
                className={cn(
                  "p-6 rounded-3xl border-2 flex flex-col items-center space-y-3 transition-all",
                  !isAgreed 
                    ? "bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10 scale-[1.02]" 
                    : "bg-white border-gray-100 opacity-50 hover:opacity-100"
                )}
              >
                <XCircle className={cn("h-8 w-8", !isAgreed ? "text-rose-500" : "text-gray-300")} />
                <span className={cn("text-xs font-black uppercase tracking-widest", !isAgreed ? "text-rose-500" : "text-gray-400")}>Menolak</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Site Marking (Gigi Geligi)</label>
            <div className="p-8 bg-gray-50/50 border-2 border-gray-100 rounded-[2.5rem] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {renderToothGrid(TOOTH_NUMBERS.UPPER_RIGHT, 'Kanan Atas')}
                {renderToothGrid(TOOTH_NUMBERS.UPPER_LEFT, 'Kiri Atas')}
                {renderToothGrid(TOOTH_NUMBERS.LOWER_RIGHT, 'Kanan Bawah')}
                {renderToothGrid(TOOTH_NUMBERS.LOWER_LEFT, 'Kiri Bawah')}
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {selectedTeeth.length > 0 ? (
                  selectedTeeth.map(t => (
                    <Badge key={t} className="bg-pop-blue text-white px-4 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">Gigi {t}</Badge>
                  ))
                ) : (
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Belum ada gigi yang ditandai</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Catatan Tambahan</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Berikan catatan tambahan jika diperlukan..."
              className="w-full h-32 p-6 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic flex items-center">
                <Signature className="h-4 w-4 mr-2" /> Tanda Tangan Pasien
              </label>
              <div className="border-2 border-gray-100 rounded-3xl bg-white overflow-hidden shadow-inner">
                <SignatureCanvas 
                  ref={patientSigRef}
                  penColor="#1A1A1A"
                  canvasProps={{ className: "w-full h-48 cursor-crosshair" }}
                />
              </div>
              <Button type="button" variant="ghost" onClick={() => patientSigRef.current?.clear()} className="w-full text-[8px] font-black uppercase tracking-widest py-2">Bersihkan</Button>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic flex items-center">
                <Stethoscope className="h-4 w-4 mr-2" /> Tanda Tangan Dokter
              </label>
              <div className="border-2 border-gray-100 rounded-3xl bg-white overflow-hidden shadow-inner">
                <SignatureCanvas 
                  ref={doctorSigRef}
                  penColor="#1A1A1A"
                  canvasProps={{ className: "w-full h-48 cursor-crosshair" }}
                />
              </div>
              <Button type="button" variant="ghost" onClick={() => doctorSigRef.current?.clear()} className="w-full text-[8px] font-black uppercase tracking-widest py-2">Bersihkan</Button>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="px-10 py-7 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-gray-100">Batal</Button>
            <Button type="submit" variant="primary" className="px-12 py-7 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pop-blue/20">Simpan Informed Consent</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
