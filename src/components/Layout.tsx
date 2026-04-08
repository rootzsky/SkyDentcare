/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Stethoscope,
  ShieldCheck,
  Database,
  BookOpen,
  Receipt,
  FileText,
  Video
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from './ui/Button';

interface LayoutProps {
  children: ReactNode;
  userProfile: { displayName: string; role: string } | null;
  onLogout: () => void;
}

export function Layout({ children, userProfile, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userRole = userProfile?.role || 'guest';

  const menuItems = [
    {icon: LayoutDashboard, label: 'Dashboard', href: '#dashboard', roles: ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'patient', 'supervisor'] },
    {icon: Users, label: 'Data Pasien', href: '#patients', roles: ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'supervisor'] },
    {icon: ClipboardList, label: 'Rekam Medis', href: '#medical-records', roles: ['admin', 'dentist', 'dental_therapist', 'supervisor'] },
    {icon: Calendar, label: 'Jadwal', href: '#appointments', roles: ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'supervisor'] },
    {icon: FileText, label: 'Informed Consent', href: '#informed-consent', roles: ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'supervisor'] },
    {icon: Video, label: 'Edukasi Gigi', href: '#education', roles: ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'patient', 'supervisor'] },
    {icon: Receipt, label: 'Billing', href: '#billing', roles: ['admin', 'admin_staff', 'supervisor'] },
    {icon: BookOpen, label: 'Pedoman Diagnosa', href: '#diagnosis-guidelines', roles: ['admin', 'dentist', 'dental_therapist', 'supervisor'] },
    {icon: BarChart3, label: 'Laporan', href: '#reports', roles: ['admin', 'dentist', 'supervisor'] },
    {icon: Database, label: 'Data Master', href: '#master-data', roles: ['admin', 'supervisor'] },
    {icon: ShieldCheck, label: 'Keamanan', href: '#security', roles: ['admin', 'supervisor'] },
    {icon: Settings, label: 'Pengaturan', href: '#settings', roles: ['admin', 'supervisor'] },
    { icon: ClipboardList, label: 'Pendaftaran', href: '#registration', roles: ['patient'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));
  const currentHash = window.location.hash || '#dashboard';

  return (
    <div className="min-h-screen bg-pop-bg flex font-sans text-pop-text overflow-hidden">
      {/* Animated background blobs for main content */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-pop-pink/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] bg-pop-blue/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-80 bg-pop-card border-r border-gray-100 shadow-[20px_0_60px_rgba(0,0,0,0.03)] z-30">
        <div className="p-10 flex items-center space-x-5">
          <div className="bg-pop-card p-4 rounded-[1.5rem] border-2 border-pop-pink shadow-xl shadow-pop-pink/10">
            <Stethoscope className="h-7 w-7 text-pop-pink" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-pop-text tracking-tighter uppercase italic leading-none">DentaCare</span>
            <span className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em] mt-1">RME System</span>
          </div>
        </div>

        <nav className="flex-1 px-8 space-y-4 mt-8 overflow-y-auto scrollbar-hide">
          {filteredMenuItems.map((item) => {
            const isActive = currentHash === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center space-x-5 px-6 py-5 rounded-[1.5rem] transition-all duration-500 group relative overflow-hidden border-2",
                  isActive 
                    ? "bg-pop-pink border-pop-pink text-white shadow-2xl shadow-pop-pink/30 italic font-black scale-105" 
                    : "text-gray-400 border-transparent hover:bg-gray-50 hover:text-pop-blue hover:border-gray-100"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform duration-500 group-hover:scale-125", isActive ? "text-white" : "text-gray-400 group-hover:text-pop-blue")} />
                <span className={cn("text-[10px] uppercase tracking-[0.2em] font-black", isActive ? "text-white" : "text-gray-400 group-hover:text-pop-blue")}>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-8 border-t border-gray-50">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-pop-pink hover:bg-pop-pink/5 px-6 py-8 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all duration-500 border-2 border-transparent hover:border-pop-pink/20"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5 mr-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden transition-opacity duration-300",
        isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={() => setIsSidebarOpen(false)} />
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-pop-card shadow-2xl md:hidden transition-transform duration-500 ease-out border-r border-gray-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-pop-card p-2 rounded-xl border-2 border-pop-pink">
              <Stethoscope className="h-5 w-5 text-pop-pink" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic text-pop-text">DentaCare</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-xl bg-gray-100 text-gray-400 hover:text-pop-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-6 space-y-2">
          {filteredMenuItems.map((item) => {
            const isActive = currentHash === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-pop-pink text-white shadow-lg shadow-pop-pink/20 italic font-black" 
                    : "text-gray-400 hover:bg-gray-50"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs uppercase tracking-widest font-black">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-pop-pink hover:bg-pop-pink/10 px-5 py-6 rounded-2xl font-black uppercase tracking-widest text-xs"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5 mr-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-pop-card/80 backdrop-blur-xl border-b border-gray-200 h-24 flex items-center justify-between px-6 md:px-10 sticky top-0 z-20">
          <button
            className="md:hidden p-4 rounded-2xl bg-gray-100 text-pop-blue hover:bg-gray-200 transition-colors border-2 border-pop-blue/20"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 md:flex-none" />

          <div className="flex items-center space-x-8">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-pop-text leading-tight italic uppercase tracking-tighter">{userProfile?.displayName || 'User Name'}</p>
              <p className="text-[10px] font-black text-pop-pink uppercase tracking-[0.3em] mt-1">
                {userRole.replace('_', ' ')}
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-pop-bg flex items-center justify-center text-pop-blue font-black text-xl border-2 border-pop-blue pop-shadow-blue ring-4 ring-pop-blue/5">
              {userProfile?.displayName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
