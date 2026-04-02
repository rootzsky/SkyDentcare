/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ShieldCheck, 
  Lock, 
  History, 
  Eye, 
  FileKey,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';

const auditLogs = [
  { id: 1, user: 'Admin', action: 'Login Berhasil', target: '-', time: '30 Mar 2026, 09:00:05', status: 'success' },
  { id: 2, user: 'Terapis Gigi', action: 'Update Rekam Medis', target: 'RM-001', time: '30 Mar 2026, 09:15:22', status: 'success' },
  { id: 3, user: 'Petugas Admin', action: 'Tambah Pasien Baru', target: 'RM-006', time: '30 Mar 2026, 10:05:10', status: 'success' },
  { id: 4, user: 'Unknown', action: 'Gagal Login', target: '-', time: '30 Mar 2026, 10:10:00', status: 'failed' },
  { id: 5, user: 'Admin', action: 'Export Laporan Agregat', target: 'Laporan_Maret.csv', time: '30 Mar 2026, 11:30:45', status: 'success' },
];

export function Security() {
  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Keamanan & Audit</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Monitoring akses data dan kepatuhan standar keamanan RME.</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-pop-green/5 border-2 border-pop-green/20 rounded-2xl shadow-lg shadow-pop-green/5">
          <ShieldCheck className="h-6 w-6 text-pop-green" />
          <span className="text-[10px] font-black text-pop-green uppercase tracking-[0.2em]">Sistem Terlindungi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-white text-pop-text rounded-[3rem] transition-all duration-500 hover:-translate-y-2 hover:border-pop-blue/30 shadow-xl shadow-gray-200/50">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pop-blue/5 blur-3xl group-hover:bg-pop-blue/10 transition-all duration-500" />
          <CardContent className="p-12 space-y-8 relative z-10">
            <div className="bg-pop-blue/5 p-5 rounded-3xl w-fit border-2 border-pop-blue/10">
              <Lock className="h-10 w-10 text-pop-blue" />
            </div>
            <div>
              <p className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em] italic">Status Enkripsi</p>
              <p className="text-4xl font-black mt-3 tracking-tighter italic text-pop-text">AES-256 Aktif</p>
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">Seluruh data rekam medis dienkripsi pada tingkat database dan transmisi end-to-end.</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-white text-pop-text rounded-[3rem] transition-all duration-500 hover:-translate-y-2 hover:border-pop-green/30 shadow-xl shadow-gray-200/50">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pop-green/5 blur-3xl group-hover:bg-pop-green/10 transition-all duration-500" />
          <CardContent className="p-12 space-y-8 relative z-10">
            <div className="bg-pop-green/5 p-5 rounded-3xl w-fit border-2 border-pop-green/10">
              <ShieldCheck className="h-10 w-10 text-pop-green" />
            </div>
            <div>
              <p className="text-[10px] font-black text-pop-green uppercase tracking-[0.3em] italic">Kepatuhan PMK</p>
              <p className="text-4xl font-black mt-3 tracking-tighter italic text-pop-text">PMK 24/2022</p>
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">Sistem memenuhi standar teknis dan hukum rekam medis elektronik Indonesia sesuai regulasi terbaru.</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-white text-pop-text rounded-[3rem] transition-all duration-500 hover:-translate-y-2 hover:border-pop-pink/30 shadow-xl shadow-gray-200/50">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pop-pink/5 blur-3xl group-hover:bg-pop-pink/10 transition-all duration-500" />
          <CardContent className="p-12 space-y-8 relative z-10">
            <div className="bg-pop-pink/5 p-5 rounded-3xl w-fit border-2 border-pop-pink/10">
              <FileKey className="h-10 w-10 text-pop-pink" />
            </div>
            <div>
              <p className="text-[10px] font-black text-pop-pink uppercase tracking-[0.3em] italic">Backup Otomatis</p>
              <p className="text-4xl font-black mt-3 tracking-tighter italic text-pop-text">Harian (00:00)</p>
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">Data dicadangkan secara otomatis ke server redundan setiap hari untuk menjamin ketersediaan data.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gray-100 bg-pop-card shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-12 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Audit Trail (Log Aktivitas)</CardTitle>
            <CardDescription className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Catatan kronologis seluruh interaksi dengan data sensitif.</CardDescription>
          </div>
          <div className="bg-white p-5 rounded-3xl border-2 border-gray-100 shadow-lg shadow-gray-200/50">
            <History className="h-8 w-8 text-pop-blue" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Waktu</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Pengguna</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Aktivitas</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Target</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-gray-50/50 transition-all duration-300">
                    <td className="px-12 py-8 whitespace-nowrap text-[11px] text-gray-400 font-black font-mono tracking-tighter">{log.time}</td>
                    <td className="px-12 py-8 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-pop-blue/5 border-2 border-pop-blue/10 flex items-center justify-center text-[10px] font-black text-pop-blue uppercase">
                          {log.user.substring(0, 2)}
                        </div>
                        <div className="text-xs font-black text-pop-text uppercase tracking-widest">{log.user}</div>
                      </div>
                    </td>
                    <td className="px-12 py-8 whitespace-nowrap text-xs font-bold text-gray-500 uppercase tracking-widest">{log.action}</td>
                    <td className="px-12 py-8 whitespace-nowrap text-xs font-bold text-gray-400 uppercase tracking-widest">{log.target}</td>
                    <td className="px-12 py-8 whitespace-nowrap">
                      <Badge 
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                          log.status === 'success' 
                            ? 'bg-pop-green/10 text-pop-green border-pop-green/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}
                      >
                        {log.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 border-gray-100 bg-red-50/5 rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
          <CardHeader className="p-12 pb-8">
            <CardTitle className="text-2xl font-black flex items-center text-red-500 uppercase italic tracking-tight">
              <div className="bg-red-500/10 p-4 rounded-2xl mr-5 border-2 border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              Peringatan Keamanan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12 pt-0">
            <div className="space-y-6">
              <div className="flex items-start space-x-6 p-8 bg-white rounded-[2.5rem] border-2 border-red-500/10 shadow-lg shadow-gray-200/30 hover:border-red-500/30 transition-all">
                <div className="bg-red-500/10 p-4 rounded-2xl border-2 border-red-500/20">
                  <Eye className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-pop-text uppercase tracking-widest">Upaya Login Gagal Terdeteksi</p>
                  <p className="text-xs text-gray-400 font-bold mt-2 leading-relaxed uppercase tracking-widest">IP 192.168.1.45 mencoba login 5 kali berturut-turut pada akun Administrator.</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] italic">Tindakan: IP Diblokir Sementara</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
