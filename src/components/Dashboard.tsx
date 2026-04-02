/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Activity, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Bell,
  PlusCircle,
  FileText,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { db, collection, onSnapshot, query, where, OperationType, handleFirestoreError, getDocs, Timestamp } from '../firebase';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Badge } from './ui/Badge';
import { Billing } from '../types';

export function Dashboard() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [avgDmft, setAvgDmft] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const patientsUnsubscribe = onSnapshot(
      collection(db, 'patients'),
      async (snapshot) => {
        setTotalPatients(snapshot.size);
        
        // Calculate average DMF-T
        let totalD = 0, totalM = 0, totalF = 0, recordCount = 0;
        
        for (const patientDoc of snapshot.docs) {
          const recordsSnapshot = await getDocs(collection(db, 'patients', patientDoc.id, 'records'));
          recordsSnapshot.forEach(recordDoc => {
            const data = recordDoc.data();
            if (data.indices?.dmft) {
              totalD += data.indices.dmft.d || 0;
              totalM += data.indices.dmft.m || 0;
              totalF += data.indices.dmft.f || 0;
              recordCount++;
            }
          });
        }
        
        if (recordCount > 0) {
          setAvgDmft((totalD + totalM + totalF) / recordCount);
        }
        
        setIsLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'patients')
    );

    const today = new Date().toISOString().split('T')[0];
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '==', today)
    );

    const appointmentsUnsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodayAppointments(appointments);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'appointments')
    );

    const billingsUnsubscribe = onSnapshot(
      collection(db, 'billings'),
      (snapshot) => {
        const billings = snapshot.docs.map(doc => doc.data() as Billing);
        const total = billings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.totalAmount, 0);
        const pending = billings.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.totalAmount, 0);
        setTotalRevenue(total);
        setPendingRevenue(pending);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'billings')
    );

    return () => {
      patientsUnsubscribe();
      appointmentsUnsubscribe();
      billingsUnsubscribe();
    };
  }, []);

  const stats = [
    { label: 'Total Pasien', value: totalPatients.toString(), icon: Users, color: 'text-pop-blue', bg: 'bg-pop-blue/10', border: 'border-pop-blue/30', trend: '+12%', trendUp: true },
    { label: 'Kunjungan Hari Ini', value: todayAppointments.length.toString(), icon: Calendar, color: 'text-pop-green', bg: 'bg-pop-green/10', border: 'border-pop-green/30', trend: '+5%', trendUp: true },
    { label: 'Total Pendapatan', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-pop-yellow', bg: 'bg-pop-yellow/10', border: 'border-pop-yellow/30', trend: '+8%', trendUp: true },
    { label: 'Rata-rata DMF-T', value: avgDmft.toFixed(1), icon: Activity, color: 'text-pop-pink', bg: 'bg-pop-pink/10', border: 'border-pop-pink/30', trend: '-2%', trendUp: false },
  ];

  const dmftData = [
    { month: 'Jan', value: 3.5 },
    { month: 'Feb', value: 3.4 },
    { month: 'Mar', value: 3.2 },
    { month: 'Apr', value: 3.1 },
    { month: 'May', value: 3.0 },
    { month: 'Jun', value: avgDmft || 2.9 },
  ];

  const visitData = [
    { day: 'Sen', visits: 18 },
    { day: 'Sel', visits: 22 },
    { day: 'Rab', visits: 15 },
    { day: 'Kam', visits: 25 },
    { day: 'Jum', visits: 20 },
    { day: 'Sab', visits: 12 },
  ];

  const quickActions = [
    { label: 'Pasien Baru', icon: PlusCircle, color: 'text-pop-blue', bg: 'bg-pop-blue/10', border: 'border-pop-blue/30' },
    { label: 'Buat Janji', icon: Calendar, color: 'text-pop-green', bg: 'bg-pop-green/10', border: 'border-pop-green/30' },
    { label: 'Input Rekam', icon: FileText, color: 'text-pop-pink', bg: 'bg-pop-pink/10', border: 'border-pop-pink/30' },
    { label: 'Billing', icon: CreditCard, color: 'text-pop-yellow', bg: 'bg-pop-yellow/10', border: 'border-pop-yellow/30' },
  ];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Dashboard</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Selamat datang kembali di <span className="text-pop-pink">DentaCare</span> RME.</p>
        </div>
        <div className="flex items-center space-x-3 bg-pop-card p-4 rounded-2xl border-2 border-gray-100 shadow-xl">
          <Calendar className="h-5 w-5 text-pop-blue" />
          <span className="text-xs font-black text-pop-text uppercase tracking-widest">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {quickActions.map((action) => (
          <Button 
            key={action.label}
            variant="ghost" 
            className={cn(
              "h-auto py-10 flex flex-col items-center justify-center gap-5 border-2 border-gray-100 bg-pop-card hover:border-pop-blue/50 hover:bg-pop-blue/5 transition-all duration-500 rounded-[3rem] group shadow-sm",
              action.label === 'Pasien Baru' && 'hover:border-pop-blue/50 hover:bg-pop-blue/5',
              action.label === 'Buat Janji' && 'hover:border-pop-green/50 hover:bg-pop-green/5',
              action.label === 'Input Rekam' && 'hover:border-pop-pink/50 hover:bg-pop-pink/5',
              action.label === 'Billing' && 'hover:border-pop-yellow/50 hover:bg-pop-yellow/5'
            )}
          >
            <div className={cn("p-5 rounded-3xl group-hover:scale-125 transition-all duration-500 border-2", action.bg, action.border)}>
              <action.icon className={cn("h-8 w-8", action.color)} />
            </div>
            <span className="text-[10px] font-black text-gray-400 group-hover:text-pop-text uppercase tracking-[0.3em] transition-colors">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-2 border-gray-100 bg-pop-card hover:border-pop-blue/30 transition-all duration-500 group overflow-hidden relative rounded-[2.5rem] shadow-sm">
            <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-10 transition-all duration-700 group-hover:scale-150 group-hover:opacity-20", stat.bg)} />
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between">
                <div className={cn(stat.bg, stat.border, "p-4 rounded-2xl border-2")}>
                  <stat.icon className={cn(stat.color, "h-6 w-6")} />
                </div>
                <div className={cn(
                  "flex items-center space-x-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  stat.trendUp ? "bg-pop-green/10 text-pop-green border border-pop-green/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                )}>
                  {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>{stat.trend}</span>
                </div>
              </div>
              <div className="mt-8">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{stat.label}</p>
                <p className="text-4xl font-black text-pop-text mt-2 tracking-tighter italic">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2 border-gray-100 bg-pop-card rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
          <CardHeader className="flex flex-row items-center justify-between p-10 pb-4">
            <div>
              <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Tren Kesehatan & Kunjungan</CardTitle>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Analisis Data Pasien Bulanan</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-pop-blue/10 text-pop-blue border-pop-blue/30 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Bulanan</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <div className="h-[350px] min-h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={dmftData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#ffffff', borderRadius: '24px', border: '2px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                    itemStyle={{color: '#00d4ff', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px'}}
                    labelStyle={{color: '#0a0a0a', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#00d4ff" 
                    strokeWidth={6}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    name="Indeks DMF-T"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
 
        <Card className="border-2 border-gray-100 bg-pop-card rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
          <CardHeader className="p-10 pb-4">
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Kunjungan</CardTitle>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Statistik Mingguan</p>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <div className="h-[350px] min-h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={visitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc', radius: 10}}
                    contentStyle={{backgroundColor: '#ffffff', borderRadius: '24px', border: '2px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                    itemStyle={{color: '#ff00ff', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px'}}
                    labelStyle={{color: '#0a0a0a', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px'}}
                  />
                  <Bar dataKey="visits" fill="#ff00ff" radius={[12, 12, 0, 0]} name="Kunjungan" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2 border-gray-100 bg-pop-card overflow-hidden rounded-[3rem] shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-100 p-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-black text-pop-text uppercase italic tracking-tighter">Antrian Hari Ini</CardTitle>
                <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">Daftar Pasien Terjadwal</p>
              </div>
              <Badge variant="outline" className="bg-pop-blue/10 text-pop-blue border-pop-blue/30 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                {todayAppointments.length} Pasien
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="group flex items-center justify-between p-10 hover:bg-gray-50 transition-all duration-300">
                    <div className="flex items-center space-x-8">
                      <div className="h-20 w-20 rounded-[2rem] bg-pop-pink flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-pop-pink/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        {appointment.patientName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xl font-black text-pop-text tracking-tight uppercase italic">{appointment.patientName}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                            <Clock className="h-3 w-3 text-pop-blue" />
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{appointment.time}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ID: {appointment.id.substring(0, 5)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <Badge 
                        className={cn(
                          "px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border-2",
                          appointment.status === 'completed' ? 'bg-pop-green/10 text-pop-green border-pop-green/30' :
                          appointment.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                          'bg-pop-blue/10 text-pop-blue border-pop-blue/30'
                        )}
                      >
                        {appointment.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-gray-100 hover:text-pop-blue border-2 border-transparent hover:border-pop-blue/30">
                        <ArrowUpRight className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-32">
                  <div className="h-24 w-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-gray-100">
                    <Calendar className="h-12 w-12 text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-xs italic">Antrian Kosong</p>
                  <p className="text-gray-500 text-sm mt-3 font-medium uppercase tracking-widest">Tidak ada jadwal untuk hari ini.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-2 border-pop-pink/30 bg-pop-card text-pop-text overflow-hidden relative rounded-[3rem] pop-shadow-pink shadow-sm">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-pop-pink/10 blur-3xl animate-pulse" />
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-pop-pink italic">Status Keuangan</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="space-y-10">
                <div>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Pendapatan Tertunda</p>
                  <p className="text-6xl font-black mt-3 tracking-tighter italic text-pop-text">{formatCurrency(pendingRevenue)}</p>
                </div>
                <div className="pt-8 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Target Bulanan</span>
                    <span className="text-sm font-black text-pop-blue">85%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden border border-gray-200">
                    <div className="bg-gradient-to-r from-pop-pink to-pop-purple h-full rounded-full shadow-[0_0_20px_rgba(255,0,255,0.3)]" style={{width: '85%'}} />
                  </div>
                </div>
                <Button className="w-full bg-pop-pink text-white hover:bg-pop-purple py-8 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-pop-pink/30 border-none transition-all hover:scale-[1.02] active:scale-95">
                  Detail Transaksi
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 bg-pop-card rounded-[3rem] overflow-hidden shadow-sm">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Notifikasi Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="space-y-6">
                <div className="group flex items-start space-x-5 p-6 rounded-[2rem] bg-pop-yellow/5 border-2 border-pop-yellow/20 hover:border-pop-yellow/50 transition-all cursor-pointer">
                  <div className="bg-pop-card p-3 rounded-xl border-2 border-pop-yellow shadow-lg shadow-pop-yellow/10">
                    <AlertCircle className="h-6 w-6 text-pop-yellow" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-pop-text uppercase tracking-tight italic">Stok Obat Menipis</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-2 leading-relaxed uppercase tracking-widest">Paracetamol 500mg tersisa 10 strip.</p>
                  </div>
                </div>
                <div className="group flex items-start space-x-5 p-6 rounded-[2rem] bg-pop-blue/5 border-2 border-pop-blue/20 hover:border-pop-blue/50 transition-all cursor-pointer">
                  <div className="bg-pop-card p-3 rounded-xl border-2 border-pop-blue shadow-lg shadow-pop-blue/10">
                    <Bell className="h-6 w-6 text-pop-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-pop-text uppercase tracking-tight italic">Update Sistem</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-2 leading-relaxed uppercase tracking-widest">Modul Billing v2.0 diaktifkan.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
