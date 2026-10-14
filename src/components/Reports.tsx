/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { 
  Download, 
  Printer, 
  ChevronDown, 
  Users, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Database, 
  Search, 
  Filter, 
  Stethoscope, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck,
  Check,
  RotateCw,
  FolderSync
} from 'lucide-react';
import { 
  dummy100Patients, 
  compute100PatientsAnalytics, 
  dummyFollowUpPrograms, 
  DentalPatient100 
} from '../data/dummy100Patients';
import { db, doc, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function Reports() {
  const [activeTab, setActiveTab] = useState<'analytics100' | 'programs' | 'patientTable' | 'aggregate'>('analytics100');
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('all');
  const [selectedPatientModal, setSelectedPatientModal] = useState<DentalPatient100 | null>(null);
  
  // Follow-up program status interactive tracking
  const [programsList, setProgramsList] = useState(dummyFollowUpPrograms);

  // Firestore sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Aggregated analytics derived from the 100 patient records
  const analytics = useMemo(() => compute100PatientsAnalytics(dummy100Patients), []);

  // Filtered 100 Patients
  const filtered100Patients = useMemo(() => {
    return dummy100Patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
                          p.medicalRecordNumber.toLowerCase().includes(searchPatient.toLowerCase()) ||
                          p.nik.includes(searchPatient) ||
                          p.city.toLowerCase().includes(searchPatient.toLowerCase());
      const matchAge = selectedAgeGroup === 'all' || p.ageGroup === selectedAgeGroup;
      const matchDiag = selectedDiagnosis === 'all' || p.primaryDiagnosis.toLowerCase().includes(selectedDiagnosis.toLowerCase());
      return matchSearch && matchAge && matchDiag;
    });
  }, [searchPatient, selectedAgeGroup, selectedDiagnosis]);

  // Chart data preparation
  const ageChartData = useMemo(() => {
    if (!analytics) return [];
    return [
      { label: 'Pediatrik (0-12)', count: analytics.ageGroupsCount['pediatrik'] || 0 },
      { label: 'Remaja (13-18)', count: analytics.ageGroupsCount['remaja'] || 0 },
      { label: 'Dewasa Muda (19-35)', count: analytics.ageGroupsCount['dewasa_muda'] || 0 },
      { label: 'Dewasa (36-50)', count: analytics.ageGroupsCount['dewasa'] || 0 },
      { label: 'Lansia (51+)', count: analytics.ageGroupsCount['lansia'] || 0 },
    ];
  }, [analytics]);

  const diagnosisChartData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.diagnosisCount).map(([name, value]) => ({
      name,
      value
    }));
  }, [analytics]);

  const dmftCategoryData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'Sangat Rendah (< 1.2)', value: analytics.dmftCategoryCount['Sangat Rendah'] || 0 },
      { name: 'Rendah (1.2 - 2.6)', value: analytics.dmftCategoryCount['Rendah'] || 0 },
      { name: 'Sedang (2.7 - 4.4)', value: analytics.dmftCategoryCount['Sedang'] || 0 },
      { name: 'Tinggi (4.5 - 6.5)', value: analytics.dmftCategoryCount['Tinggi'] || 0 },
      { name: 'Sangat Tinggi (> 6.5)', value: analytics.dmftCategoryCount['Sangat Tinggi'] || 0 },
    ];
  }, [analytics]);

  const ohisChartData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'Baik (0 - 1.2)', count: analytics.ohisCategoryCount['Baik'] || 0, fill: '#10b981' },
      { name: 'Sedang (1.3 - 3.0)', count: analytics.ohisCategoryCount['Sedang'] || 0, fill: '#f59e0b' },
      { name: 'Buruk (3.1 - 6.0)', count: analytics.ohisCategoryCount['Buruk'] || 0, fill: '#ef4444' },
    ];
  }, [analytics]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const headers = [
      'No. RM',
      'NIK',
      'Nama Pasien',
      'Gender',
      'Usia',
      'Kelompok Usia',
      'Kota',
      'Asuransi',
      'DMF-T (Total)',
      'Decay (D)',
      'Missing (M)',
      'Filled (F)',
      'OHI-S Total',
      'Kategori OHI-S',
      'Plaque Index',
      'Status Periodontal',
      'Diagnosis Utama',
      'Tindakan Rekomendasi'
    ];

    const rows = dummy100Patients.map(p => [
      `"${p.medicalRecordNumber}"`,
      `"${p.nik}"`,
      `"${p.name}"`,
      `"${p.gender}"`,
      p.age,
      `"${p.ageGroup}"`,
      `"${p.city}"`,
      `"${p.insurance}"`,
      p.dmft.total,
      p.dmft.decay,
      p.dmft.missing,
      p.dmft.filled,
      p.ohis.totalScore,
      `"${p.ohis.category}"`,
      p.plaqueIndex,
      `"${p.periodontalStatus}"`,
      `"${p.primaryDiagnosis.replace(/"/g, '""')}"`,
      `"${p.recommendedTreatment.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_analisis_100_pasien_dentacare_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV 100 Pasien berhasil diunduh!');
  };

  // Sync 100 patients to Firestore
  const handleSyncToFirestore = async () => {
    if (!confirm('Apakah Anda ingin menyinkronkan 100 data dummy pasien ke koleksi Firestore "patients"? Ini akan memuat 100 profil pasien lengkap ke database aktif.')) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      let count = 0;
      for (const p of dummy100Patients) {
        await setDoc(doc(db, 'patients', p.id), {
          id: p.id,
          medicalRecordNumber: p.medicalRecordNumber,
          nik: p.nik,
          name: p.name,
          gender: p.gender === 'L' ? 'male' : 'female',
          birthDate: p.birthDate,
          age: p.age,
          address: p.address,
          city: p.city,
          phone: p.phone,
          bloodType: p.bloodType,
          systemicConditions: p.systemicConditions,
          insurance: p.insurance,
          status: 'active',
          dmft: p.dmft,
          ohis: p.ohis,
          primaryDiagnosis: p.primaryDiagnosis,
          createdAt: new Date(p.registrationDate).toISOString(),
          updatedAt: new Date(p.lastVisitDate).toISOString()
        }, { merge: true });

        count++;
        setSyncProgress(Math.round((count / dummy100Patients.length) * 100));
      }
      toast.success('Berhasil! 100 Pasien telah disinkronkan ke database Firestore DentaCare.');
    } catch (error) {
      console.error('Error syncing 100 patients:', error);
      toast.error('Gagal sinkronisasi data ke Firestore. Silakan periksa koneksi.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProgramStatus = (progId: string, newStatus: 'direncanakan' | 'berjalan' | 'evaluasi') => {
    setProgramsList(prev => prev.map(pr => pr.id === progId ? { ...pr, status: newStatus } : pr));
    toast.success(`Status program diperbarui menjadi: ${newStatus.toUpperCase()}`);
  };

  return (
    <div className="space-y-10 pb-20 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">
              Laporan Analisis Klinis
            </h1>
            <Badge variant="blue" className="px-3 py-1 font-black text-xs uppercase tracking-widest">
              100 Pasien Terintegrasi
            </Badge>
          </div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">
            Analisis epidemiologi dental komprehensif (DMF-T & OHI-S) dan rekomendasi program tindak lanjut.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handlePrint}
            className="flex items-center space-x-3 px-6 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 bg-white hover:bg-gray-50 shadow-md"
          >
            <Printer className="h-4 w-4 text-pop-purple" />
            <span className="text-pop-text">Cetak Laporan</span>
          </Button>

          <Button 
            variant="ghost"
            onClick={handleDownloadCSV}
            className="flex items-center space-x-3 px-6 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 bg-white hover:bg-gray-50 shadow-md"
          >
            <Download className="h-4 w-4 text-pop-green" />
            <span className="text-pop-text">Unduh CSV (100 Pasien)</span>
          </Button>

          <Button 
            variant="primary" 
            onClick={handleSyncToFirestore}
            disabled={isSyncing}
            className="px-8 py-6 rounded-2xl shadow-xl shadow-pop-blue/20 font-black uppercase tracking-widest text-xs"
          >
            {isSyncing ? (
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderSync className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? `Sinkronisasi (${syncProgress}%)...` : 'Sinkronkan 100 Pasien ke DB'}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-gray-100 pb-4 print:hidden">
        <button
          onClick={() => setActiveTab('analytics100')}
          className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 border-2 ${
            activeTab === 'analytics100'
              ? 'bg-pop-blue border-pop-blue text-white shadow-xl shadow-pop-blue/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-pop-text'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Analisis Epidemiologi 100 Pasien</span>
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 border-2 ${
            activeTab === 'programs'
              ? 'bg-pop-purple border-pop-purple text-white shadow-xl shadow-pop-purple/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-pop-text'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Rekomendasi Program Tindak Lanjut</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
            activeTab === 'programs' ? 'bg-white/20 text-white' : 'bg-pop-purple/10 text-pop-purple'
          }`}>
            5 Program Klinis
          </span>
        </button>

        <button
          onClick={() => setActiveTab('patientTable')}
          className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 border-2 ${
            activeTab === 'patientTable'
              ? 'bg-pop-pink border-pop-pink text-white shadow-xl shadow-pop-pink/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-pop-text'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Tabel Lengkap 100 Pasien</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
            activeTab === 'patientTable' ? 'bg-white/20 text-white' : 'bg-pop-pink/10 text-pop-pink'
          }`}>
            100 Data
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ANALISIS EPIDEMIOLOGI 100 PASIEN                                 */}
      {/* ========================================================================= */}
      {activeTab === 'analytics100' && analytics && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* Executive KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 border-pop-blue/20 bg-gradient-to-br from-pop-blue/5 to-white shadow-xl rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em]">Total Sampel Pasien</span>
                <Users className="h-5 w-5 text-pop-blue" />
              </div>
              <p className="text-5xl font-black text-pop-text mt-4 tracking-tighter italic">100</p>
              <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>Laki-laki: {analytics.genderCount.L}</span>
                <span>Perempuan: {analytics.genderCount.P}</span>
              </div>
            </Card>

            <Card className="border-2 border-pop-pink/20 bg-gradient-to-br from-pop-pink/5 to-white shadow-xl rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-pop-pink uppercase tracking-[0.3em]">Rata-rata DMF-T</span>
                <Stethoscope className="h-5 w-5 text-pop-pink" />
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-5xl font-black text-pop-text tracking-tighter italic">{analytics.averages.dmft}</p>
                <span className="text-[10px] font-black text-pop-pink uppercase tracking-widest">Kategori Tinggi</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[9px] font-mono font-bold text-gray-500">
                <span>D: {analytics.averages.decay}</span>
                <span>M: {analytics.averages.missing}</span>
                <span>F: {analytics.averages.filled}</span>
              </div>
            </Card>

            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-xl rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">Rata-rata OHI-S</span>
                <Activity className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-5xl font-black text-pop-text tracking-tighter italic">{analytics.averages.ohis}</p>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Kategori Sedang</span>
              </div>
              <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                Indeks Plak Rata-rata: {analytics.averages.plaqueIndex}
              </p>
            </Card>

            <Card className="border-2 border-pop-purple/20 bg-gradient-to-br from-pop-purple/5 to-white shadow-xl rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-pop-purple uppercase tracking-[0.3em]">Prevalensi Karies</span>
                <AlertCircle className="h-5 w-5 text-pop-purple" />
              </div>
              <p className="text-5xl font-black text-pop-text mt-4 tracking-tighter italic">
                {analytics.activeCariesRate}%
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>Periodontal: {analytics.periodontalDiseaseRate}%</span>
                <span>Impaksi M3: {analytics.impactionRate}%</span>
              </div>
            </Card>
          </div>

          {/* Epidemiological Summary Takeaways Box */}
          <div className="p-8 bg-gradient-to-r from-pop-blue/10 via-pop-purple/10 to-pop-pink/10 border-2 border-pop-blue/20 rounded-[2.5rem] space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-pop-blue" />
              <h3 className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                Ringkasan Temuan Epidemiologi Utama (100 Pasien)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700 font-medium leading-relaxed">
              <div className="p-4 bg-white/80 rounded-2xl border border-white shadow-sm space-y-1.5">
                <p className="font-black text-pop-pink uppercase text-[10px] tracking-wider">1. Beban Karies Anak Usia Dini</p>
                <p className="text-gray-600 text-[11px]">
                  Pada kelompok usia 5-12 tahun, 88.9% mengalami karies gigi desidui dan molar satu permanen tanpa perlindungan sealant, dengan angka DMF-T rata-rata mencapai 4.56.
                </p>
              </div>

              <div className="p-4 bg-white/80 rounded-2xl border border-white shadow-sm space-y-1.5">
                <p className="font-black text-pop-purple uppercase text-[10px] tracking-wider">2. Akumulasi Penyakit Periodontal Dewasa</p>
                <p className="text-gray-600 text-[11px]">
                  80.7% usia dewasa (19-50 thn) menderita peradangan gingiva hingga kerusakan tulang periodontal dengan akumulasi kalkulus subgingiva berat (OHI-S 2.45).
                </p>
              </div>

              <div className="p-4 bg-white/80 rounded-2xl border border-white shadow-sm space-y-1.5">
                <p className="font-black text-pop-blue uppercase text-[10px] tracking-wider">3. Kehilangan Gigi Mayor Lansia</p>
                <p className="text-gray-600 text-[11px]">
                  93.8% lansia (51+) mengalami kehilangan gigi yang signifikan (rata-rata 6.8 elemen gigi hilang) yang membutuhkan prostodonti rehabilitatif (GTSL / GTL).
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Demografi Usia & Prevalensi Diagnosa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                  Distribusi Kelompok Usia Pasien
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">
                  Pediatrik (18) • Remaja (14) • Dewasa Muda (30) • Dewasa (22) • Lansia (16)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[320px] min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 800 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #f3f4f6' }}
                        itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', color: '#3b82f6' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                  Prevalensi Diagnosa Klinis Utama
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">
                  Berdasarkan Kode Klasifikasi ICD-10 Gigi & Mulut
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[320px] min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={diagnosisChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {diagnosisChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #f3f4f6' }}
                        itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        iconType="circle"
                        formatter={(val) => <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider ml-1">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: DMF-T Category & OHI-S Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                  Tingkat Keparahan DMF-T (Standar WHO)
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">
                  Distribusi 100 pasien berdasarkan kategori keparahan karies
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dmftCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={140} 
                        tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 800 }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #f3f4f6' }}
                      />
                      <Bar dataKey="value" fill="#ec4899" radius={[0, 10, 10, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                  Status Kebersihan Mulut (OHI-S)
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">
                  Kategori Green-Yellow-Red Indeks Kebersihan Mulut
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ohisChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 800 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #f3f4f6' }}
                      />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={44}>
                        {ohisChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKOMENDASI PROGRAM TINDAK LANJUT                                */}
      {/* ========================================================================= */}
      {activeTab === 'programs' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-pop-purple/5 border-2 border-pop-purple/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pop-purple text-white rounded-2xl shadow-lg shadow-pop-purple/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">
                  Program Intervensi Klinis & Komunitas
                </h2>
              </div>
              <p className="text-xs text-gray-500 font-bold max-w-2xl leading-relaxed">
                Rekomendasi program disusun secara berbasis bukti (evidence-based) dari temuan statistik 100 pasien dummy untuk menurunkan prevalensi penyakit gigi dan menaikkan standar akreditasi klinik.
              </p>
            </div>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="rounded-2xl px-6 py-5 text-xs font-black uppercase tracking-widest border-pop-purple/30 text-pop-purple hover:bg-pop-purple hover:text-white shrink-0"
            >
              <Printer className="h-4 w-4 mr-2" />
              Cetak Dokumen Proposal Program
            </Button>
          </div>

          {/* 5 Follow-Up Program Cards */}
          <div className="space-y-8">
            {programsList.map((prog, idx) => (
              <Card key={prog.id} className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden hover:border-pop-blue/30 transition-all">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-black text-gray-400">
                        {prog.code}
                      </span>
                      <Badge 
                        variant={prog.priority === 'Tinggi' ? 'pink' : 'blue'}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1"
                      >
                        Prioritas {prog.priority}
                      </Badge>
                      <Badge 
                        variant={prog.status === 'berjalan' ? 'green' : prog.status === 'evaluasi' ? 'purple' : 'blue'}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1"
                      >
                        Status: {prog.status.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-black text-pop-text tracking-tight uppercase italic">
                      {idx + 1}. {prog.title}
                    </h3>
                    <p className="text-xs font-bold text-pop-blue uppercase tracking-widest">
                      Sasaran Target: {prog.targetPopulation}
                    </p>
                  </div>

                  {/* Status Toggle & Budget */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimasi Biaya / Pasien</p>
                      <p className="text-lg font-black text-pop-text">Rp {prog.budgetEstimatePerPatient.toLocaleString('id-ID')}</p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                      {(['direncanakan', 'berjalan', 'evaluasi'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateProgramStatus(prog.id, st)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                            prog.status === st
                              ? 'bg-pop-blue text-white shadow-sm'
                              : 'text-gray-500 hover:text-pop-text'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 md:p-10 space-y-8">
                  {/* Empirical Evidence */}
                  <div className="p-6 bg-amber-50/60 border-2 border-amber-200/60 rounded-3xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        Temuan Empiris Data 100 Pasien:
                      </span>
                      <span className="text-xs font-black text-amber-800">
                        {prog.empiricalEvidence.metricLabel}: {prog.empiricalEvidence.metricValue}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-bold">
                      {prog.empiricalEvidence.clinicalFinding}
                    </p>
                  </div>

                  {/* Interventions & Targets Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Clinical Interventions */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-pop-text uppercase tracking-widest italic flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-pop-blue" />
                        Prosedur & Protokol Intervensi Klinis
                      </h4>
                      <div className="space-y-2.5">
                        {prog.clinicalInterventions.map((action, i) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                            <CheckCircle2 className="h-4 w-4 text-pop-green shrink-0 mt-0.5" />
                            <span className="text-xs font-bold text-gray-700 leading-tight">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPI Targets */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-pop-text uppercase tracking-widest italic flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-pop-purple" />
                        Target Indikator Kinerja Klinis (KPI)
                      </h4>
                      <div className="space-y-2.5">
                        {prog.kpiTargets.map((kpi, i) => (
                          <div key={i} className="p-4 bg-pop-purple/5 rounded-2xl border border-pop-purple/15 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-black text-pop-text">{kpi.indicator}</p>
                              <span className="text-[9px] font-black text-pop-purple uppercase tracking-widest mt-0.5 block">
                                Target: {kpi.targetValue}
                              </span>
                            </div>
                            <span className="px-3 py-1 bg-white rounded-xl text-[9px] font-black text-gray-500 uppercase border border-gray-200 shrink-0">
                              {kpi.timeline}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TABEL LENGKAP 100 PASIEN & DETAIL                                */}
      {/* ========================================================================= */}
      {activeTab === 'patientTable' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl print:hidden">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Cari Pasien (Nama / RM / NIK / Kota)</label>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="Ketik pencarian..."
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  className="pl-14 h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Filter Kelompok Usia</label>
              <div className="relative">
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 text-xs font-bold text-pop-text outline-none appearance-none"
                >
                  <option value="all">Semua Kelompok Usia (100 Pasien)</option>
                  <option value="pediatrik">Pediatrik (0-12 Tahun)</option>
                  <option value="remaja">Remaja (13-18 Tahun)</option>
                  <option value="dewasa_muda">Dewasa Muda (19-35 Tahun)</option>
                  <option value="dewasa">Dewasa (36-50 Tahun)</option>
                  <option value="lansia">Lansia (51+ Tahun)</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 italic">Filter Diagnosa Klinis</label>
              <div className="relative">
                <select
                  value={selectedDiagnosis}
                  onChange={(e) => setSelectedDiagnosis(e.target.value)}
                  className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 text-xs font-bold text-pop-text outline-none appearance-none"
                >
                  <option value="all">Semua Diagnosa Utama</option>
                  <option value="karies">Karies Gigi (K02)</option>
                  <option value="pulpitis">Pulpitis / Endodontik (K04)</option>
                  <option value="periodontitis">Periodontitis (K05.3)</option>
                  <option value="gingivitis">Gingivitis (K05.1)</option>
                  <option value="impaksi">Impaksi Gigi M3 (K01.1)</option>
                  <option value="edentulous">Kehilangan Gigi / GTSL (K08.1)</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                  Data Rekam Klinis 100 Pasien
                </CardTitle>
                <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">
                  Menampilkan {filtered100Patients.length} dari 100 pasien terdaftar
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={handleDownloadCSV}
                className="text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-xl px-4 py-3"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 text-pop-green" />
                Ekspor Excel / CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">No. RM & NIK</th>
                      <th className="px-6 py-4">Nama Pasien</th>
                      <th className="px-4 py-4 text-center">Usia / Gender</th>
                      <th className="px-4 py-4 text-center">Kota & Asuransi</th>
                      <th className="px-4 py-4 text-center">DMF-T (D/M/F)</th>
                      <th className="px-4 py-4 text-center">OHI-S</th>
                      <th className="px-6 py-4">Diagnosa Utama</th>
                      <th className="px-4 py-4 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filtered100Patients.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono">
                          <p className="font-black text-pop-blue">{p.medicalRecordNumber}</p>
                          <p className="text-[10px] text-gray-400">{p.nik}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-pop-text">{p.name}</p>
                          <p className="text-[10px] text-gray-400">{p.systemicConditions !== 'Tidak Ada' ? `Riwayat: ${p.systemicConditions}` : 'Sehat Tanpa Riwayat Sistemik'}</p>
                        </td>
                        <td className="px-4 py-4 text-center font-bold">
                          <span>{p.age} thn ({p.gender === 'L' ? 'Laki-laki' : 'Perempuan'})</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <p className="font-bold text-gray-700">{p.city}</p>
                          <Badge variant="blue" className="text-[8px] uppercase tracking-wider px-2 py-0.5 mt-0.5">
                            {p.insurance}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center font-mono">
                          <span className="font-black text-pop-pink text-sm">{p.dmft.total}</span>
                          <span className="text-[9px] text-gray-400 block font-normal">
                            ({p.dmft.decay}D / {p.dmft.missing}M / {p.dmft.filled}F)
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-mono">
                          <Badge 
                            variant={p.ohis.category === 'Baik' ? 'green' : p.ohis.category === 'Sedang' ? 'purple' : 'pink'}
                            className="text-[9px] font-black px-2 py-0.5"
                          >
                            {p.ohis.totalScore} ({p.ohis.category})
                          </Badge>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" title={p.primaryDiagnosis}>
                          <p className="font-bold text-gray-800 truncate">{p.primaryDiagnosis}</p>
                          <p className="text-[10px] text-pop-blue truncate">Gigi: {p.affectedTeeth.join(', ') || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedPatientModal(p)}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-gray-200 hover:bg-pop-blue hover:text-white transition-all"
                          >
                            Lihat RME
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Modal Detail Pasien */}
          {selectedPatientModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full border-2 border-gray-100 shadow-2xl space-y-6 animate-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-pop-blue">
                        {selectedPatientModal.medicalRecordNumber}
                      </span>
                      <Badge variant="blue" className="text-[9px] font-black uppercase">
                        {selectedPatientModal.ageGroup}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-black text-pop-text tracking-tight uppercase italic mt-1">
                      {selectedPatientModal.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold">
                      NIK: {selectedPatientModal.nik} • {selectedPatientModal.gender === 'L' ? 'Laki-laki' : 'Perempuan'}, {selectedPatientModal.age} Tahun
                    </p>
                  </div>
                  <button onClick={() => setSelectedPatientModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 font-mono text-center">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">DMF-T</span>
                    <p className="text-xl font-black text-pop-pink mt-1">{selectedPatientModal.dmft.total}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">OHI-S</span>
                    <p className="text-xl font-black text-pop-blue mt-1">{selectedPatientModal.ohis.totalScore}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">Plak Indeks</span>
                    <p className="text-xl font-black text-amber-600 mt-1">{selectedPatientModal.plaqueIndex}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">Gol. Darah</span>
                    <p className="text-xl font-black text-gray-700 mt-1">{selectedPatientModal.bloodType}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Diagnosis Utama (ICD-10):</p>
                    <p className="text-sm font-bold text-pop-text mt-0.5">{selectedPatientModal.primaryDiagnosis}</p>
                  </div>
                  <div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Gigi Terdampak (FDI Notation):</p>
                    <p className="text-xs font-mono font-bold text-pop-blue mt-0.5">{selectedPatientModal.affectedTeeth.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Rekomendasi Tindakan Lanjutan:</p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">{selectedPatientModal.recommendedTreatment}</p>
                  </div>
                  <div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Tindakan Terakhir:</p>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedPatientModal.lastTreatment}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Alamat & Kota</p>
                      <p className="font-bold text-gray-700">{selectedPatientModal.address}, {selectedPatientModal.city}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Penjamin / Asuransi</p>
                      <p className="font-bold text-pop-blue">{selectedPatientModal.insurance}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    variant="primary"
                    onClick={() => setSelectedPatientModal(null)}
                    className="px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest"
                  >
                    Tutup Detail
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
