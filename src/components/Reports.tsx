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
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Download, Filter, Printer, ChevronDown } from 'lucide-react';

const diseaseData = [
  { name: 'Karies', value: 45, gender: 'male', city: 'Jakarta' },
  { name: 'Gingivitis', value: 25, gender: 'female', city: 'Bandung' },
  { name: 'Periodontitis', value: 15, gender: 'male', city: 'Surabaya' },
  { name: 'Halitosis', value: 10, gender: 'female', city: 'Jakarta' },
  { name: 'Lainnya', value: 5, gender: 'male', city: 'Bandung' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ageData = [
  { range: '0-12', count: 120, gender: 'male', city: 'Jakarta' },
  { range: '13-18', count: 85, gender: 'female', city: 'Bandung' },
  { range: '19-35', count: 340, gender: 'male', city: 'Surabaya' },
  { range: '36-50', count: 210, gender: 'female', city: 'Jakarta' },
  { range: '51+', count: 145, gender: 'male', city: 'Bandung' },
];

export function Reports() {
  const [caseFilter, setCaseFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const filteredDiseaseData = useMemo(() => {
    return diseaseData.filter(item => {
      const matchGender = genderFilter === 'all' || item.gender === genderFilter;
      const matchCity = cityFilter === 'all' || item.city === cityFilter;
      const matchCase = caseFilter === 'all' || item.name === caseFilter;
      return matchGender && matchCity && matchCase;
    });
  }, [genderFilter, cityFilter, caseFilter]);

  const filteredAgeData = useMemo(() => {
    return ageData.filter(item => {
      const matchGender = genderFilter === 'all' || item.gender === genderFilter;
      const matchCity = cityFilter === 'all' || item.city === cityFilter;
      return matchGender && matchCity;
    });
  }, [genderFilter, cityFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const headers = ['Nama Kasus', 'Jumlah', 'Gender', 'Kota'];
    const rows = diseaseData.map(item => [item.name, item.value, item.gender, item.city]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "laporan_denta_care.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Laporan Agregat</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Analisis epidemiologi dan statistik pelayanan klinik.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handlePrint}
            className="flex items-center space-x-3 px-8 py-7 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 bg-white hover:bg-gray-50 transition-all shadow-lg shadow-gray-200/50"
          >
            <Printer className="h-5 w-5 text-pop-purple" />
            <span className="text-pop-text">Cetak</span>
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDownload}
            className="px-8 py-7 rounded-2xl group transition-all duration-500 shadow-xl shadow-pop-blue/20"
          >
            <Download className="h-5 w-5 mr-3 group-hover:translate-y-1 transition-transform" />
            <span className="font-black uppercase tracking-widest text-xs">Unduh CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl shadow-gray-200/50 print:hidden">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Filter Kasus</label>
          <div className="relative">
            <select 
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-[10px] outline-none appearance-none"
            >
              <option value="all">Semua Kasus</option>
              <option value="Karies">Karies</option>
              <option value="Gingivitis">Gingivitis</option>
              <option value="Periodontitis">Periodontitis</option>
              <option value="Halitosis">Halitosis</option>
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Filter Jenis Kelamin</label>
          <div className="relative">
            <select 
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-[10px] outline-none appearance-none"
            >
              <option value="all">Semua Gender</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Filter Kota</label>
          <div className="relative">
            <select 
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-[10px] outline-none appearance-none"
            >
              <option value="all">Semua Kota</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Bandung">Bandung</option>
              <option value="Surabaya">Surabaya</option>
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10">
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Prevalensi Penyakit</CardTitle>
            <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">Berdasarkan Diagnosa Utama</p>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[350px] min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={filteredDiseaseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {filteredDiseaseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#ffffff', borderRadius: '20px', border: '2px solid #f3f4f6', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', color: '#111827'}}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10">
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Demografi Pasien</CardTitle>
            <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">Distribusi Berdasarkan Rentang Usia</p>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[350px] min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={filteredAgeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}}
                  />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{backgroundColor: '#ffffff', borderRadius: '20px', border: '2px solid #f3f4f6', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10">
          <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Indeks Kesehatan Gigi Rata-rata</CardTitle>
          <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">Statistik Kumulatif Seluruh Pasien</p>
        </CardHeader>
        <CardContent className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-12 bg-pop-blue/5 rounded-[3rem] border-2 border-pop-blue/10 text-center hover:bg-pop-blue transition-all duration-500 shadow-xl shadow-gray-100/50">
              <p className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em] group-hover:text-white transition-colors italic">DMF-T Rata-rata</p>
              <p className="text-7xl font-black text-pop-text mt-6 group-hover:text-white transition-colors tracking-tighter italic">3.24</p>
              <div className="mt-8 inline-block px-6 py-2 bg-pop-blue/10 rounded-full border-2 border-pop-blue/20 group-hover:bg-white/20 group-hover:border-white/30 transition-colors">
                <p className="text-[10px] font-black text-pop-blue uppercase tracking-widest group-hover:text-white">Status: Sedang (WHO)</p>
              </div>
            </div>
            <div className="group p-12 bg-pop-green/5 rounded-[3rem] border-2 border-pop-green/10 text-center hover:bg-pop-green transition-all duration-500 shadow-xl shadow-gray-100/50">
              <p className="text-[10px] font-black text-pop-green uppercase tracking-[0.3em] group-hover:text-white transition-colors italic">OHI-S Rata-rata</p>
              <p className="text-7xl font-black text-pop-text mt-6 group-hover:text-white transition-colors tracking-tighter italic">1.12</p>
              <div className="mt-8 inline-block px-6 py-2 bg-pop-green/10 rounded-full border-2 border-pop-green/20 group-hover:bg-white/20 group-hover:border-white/30 transition-colors">
                <p className="text-[10px] font-black text-pop-green uppercase tracking-widest group-hover:text-white">Status: Baik</p>
              </div>
            </div>
            <div className="group p-12 bg-pop-pink/5 rounded-[3rem] border-2 border-pop-pink/10 text-center hover:bg-pop-pink transition-all duration-500 shadow-xl shadow-gray-100/50">
              <p className="text-[10px] font-black text-pop-pink uppercase tracking-[0.3em] group-hover:text-white transition-colors italic">Plaque Index</p>
              <p className="text-7xl font-black text-pop-text mt-6 group-hover:text-white transition-colors tracking-tighter italic">0.85</p>
              <div className="mt-8 inline-block px-6 py-2 bg-pop-pink/10 rounded-full border-2 border-pop-pink/20 group-hover:bg-white/20 group-hover:border-white/30 transition-colors">
                <p className="text-[10px] font-black text-pop-pink uppercase tracking-widest group-hover:text-white">Target: &lt; 1.0</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
