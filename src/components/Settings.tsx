/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserCog, 
  Search,
  Check,
  X,
  ChevronRight,
  Mail,
  Calendar,
  UserPlus,
  Plus,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  handleFirestoreError, 
  OperationType,
  setDoc,
  Timestamp
} from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

export function Settings() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole | ''>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  
  // Add User State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addUserData, setAddUserData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'patient' as UserRole
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles: UserRole[] = ['admin', 'dentist', 'dental_therapist', 'admin_staff', 'patient'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (uid: string) => {
    if (!newRole || !newDisplayName) return;
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        role: newRole,
        displayName: newDisplayName
      });
      
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as UserRole, displayName: newDisplayName } : u));
      setEditingUser(null);
      setNewRole('');
      setNewDisplayName('');
      toast.success('Data pengguna berhasil diperbarui');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      toast.error('Gagal memperbarui data pengguna');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserData.displayName || !addUserData.email || !addUserData.password || !addUserData.role) {
      toast.error('Semua field harus diisi');
      return;
    }

    setIsSubmitting(true);
    let secondaryApp;
    try {
      // Create a secondary app instance to create the user without signing out the admin
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        addUserData.email, 
        addUserData.password
      );
      
      const newUser: UserProfile = {
        uid: userCredential.user.uid,
        email: addUserData.email,
        displayName: addUserData.displayName,
        role: addUserData.role,
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', newUser.uid), newUser);
      
      await signOut(secondaryAuth);
      
      setUsers([...users, newUser]);
      setIsAddingUser(false);
      setAddUserData({
        displayName: '',
        email: '',
        password: '',
        role: 'patient' as UserRole
      });
      toast.success('Pengguna baru berhasil ditambahkan');
    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email sudah terdaftar');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password terlalu lemah (min. 6 karakter)');
      } else {
        toast.error('Gagal menambahkan pengguna: ' + error.message);
      }
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Pengaturan Sistem</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Manajemen pengguna, role, dan konfigurasi aplikasi.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="primary" 
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="px-8 py-7 rounded-2xl group transition-all duration-500 shadow-xl shadow-pop-blue/20"
          >
            {isAddingUser ? <X className="h-5 w-5 mr-3" /> : <UserPlus className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />}
            <span className="font-black uppercase tracking-widest text-xs">
              {isAddingUser ? 'Batal' : 'Tambah Pengguna'}
            </span>
          </Button>
          <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-pop-blue/5 border-2 border-pop-blue/20 rounded-2xl shadow-lg shadow-pop-blue/5">
            <Shield className="h-6 w-6 text-pop-blue" />
            <span className="text-[10px] font-black text-pop-blue uppercase tracking-[0.2em]">Akses Administrator</span>
          </div>
        </div>
      </div>

      {isAddingUser && (
        <Card className="border-2 border-pop-blue/30 bg-white shadow-2xl shadow-pop-blue/10 rounded-[3rem] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-pop-blue/5 border-b border-pop-blue/10 p-12">
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Tambah Pengguna Baru</CardTitle>
            <CardDescription className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Daftarkan akun baru ke dalam sistem DentaCare.</CardDescription>
          </CardHeader>
          <CardContent className="p-12">
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Nama Lengkap</label>
                <Input 
                  required
                  placeholder="Contoh: Drg. Budi Santoso"
                  value={addUserData.displayName}
                  onChange={(e) => setAddUserData({...addUserData, displayName: e.target.value})}
                  className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px]"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Email Institusi</label>
                <Input 
                  required
                  type="email"
                  placeholder="email@dentacare.com"
                  value={addUserData.email}
                  onChange={(e) => setAddUserData({...addUserData, email: e.target.value})}
                  className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px]"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Password</label>
                <div className="relative">
                  <Input 
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 karakter"
                    value={addUserData.password}
                    onChange={(e) => setAddUserData({...addUserData, password: e.target.value})}
                    className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px] pr-14"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pop-blue transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">Role / Hak Akses</label>
                <select 
                  required
                  value={addUserData.role}
                  onChange={(e) => setAddUserData({...addUserData, role: e.target.value as UserRole})}
                  className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/20 focus:border-pop-blue text-pop-text font-bold uppercase tracking-widest text-[10px] outline-none appearance-none"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-12 py-7 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pop-blue/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  ) : (
                    <Plus className="h-5 w-5 mr-3" />
                  )}
                  Simpan Pengguna
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Manajemen Pengguna</CardTitle>
              <CardDescription className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Kelola akses dan hak istimewa pengguna sistem.</CardDescription>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Cari nama atau email..." 
                className="pl-16 h-14 rounded-2xl border-2 border-gray-100 bg-white focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold uppercase tracking-widest text-[10px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Pengguna</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Role Saat Ini</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Terdaftar Pada</th>
                  <th className="px-12 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-12 py-20 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-12 w-12 border-4 border-pop-blue border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Memuat data pengguna...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-12 py-20 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tidak ada pengguna ditemukan.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="group hover:bg-gray-50/50 transition-all duration-300">
                      <td className="px-12 py-8 whitespace-nowrap">
                        {editingUser?.uid === user.uid ? (
                          <div className="flex flex-col gap-3">
                            <Input 
                              value={newDisplayName}
                              onChange={(e) => setNewDisplayName(e.target.value)}
                              className="h-10 border-2 border-pop-blue/20 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest"
                              placeholder="Nama Lengkap"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-pop-blue/5 border-2 border-pop-blue/10 flex items-center justify-center text-lg font-black text-pop-blue uppercase shadow-lg shadow-pop-blue/5">
                              {user.displayName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-pop-text uppercase tracking-tighter italic">{user.displayName}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-12 py-8 whitespace-nowrap">
                        {editingUser?.uid === user.uid ? (
                          <div className="flex items-center gap-3">
                            <select 
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value as UserRole)}
                              className="h-10 bg-white border-2 border-pop-blue/20 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-pop-blue/10"
                            >
                              <option value="">Pilih Role</option>
                              {roles.map(r => (
                                <option key={r} value={r}>{r.replace('_', ' ')}</option>
                              ))}
                            </select>
                            <Button 
                              size="sm" 
                              variant="primary" 
                              className="h-10 w-10 p-0 rounded-xl shadow-lg shadow-pop-blue/20"
                              onClick={() => handleUpdateUser(user.uid)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-10 w-10 p-0 rounded-xl border-2 border-gray-100 hover:bg-gray-100"
                              onClick={() => {
                                setEditingUser(null);
                                setNewRole('');
                                setNewDisplayName('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Badge className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-pop-blue/10 text-pop-blue border-2 border-pop-blue/20">
                            {user.role.replace('_', ' ')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-12 py-8 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {typeof user.createdAt === 'string' ? user.createdAt : user.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-12 py-8 whitespace-nowrap text-right">
                        <Button 
                          variant="ghost" 
                          className="px-6 py-3 rounded-xl border-2 border-gray-100 hover:border-pop-blue hover:text-pop-blue transition-all group/btn"
                          onClick={() => {
                            setEditingUser(user);
                            setNewRole(user.role);
                            setNewDisplayName(user.displayName);
                          }}
                        >
                          <UserCog className="h-4 w-4 mr-3 group-hover/btn:rotate-12 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ubah Role</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 border-gray-100 bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
          <CardHeader className="p-12">
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Informasi Role</CardTitle>
            <CardDescription className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Deskripsi hak akses untuk setiap role.</CardDescription>
          </CardHeader>
          <CardContent className="p-12 pt-0 space-y-6">
            {[
              { role: 'admin', desc: 'Akses penuh ke seluruh modul sistem, termasuk pengaturan dan data master.' },
              { role: 'dentist', desc: 'Akses ke rekam medis, odontogram, dan laporan klinis.' },
              { role: 'dental_therapist', desc: 'Akses ke rekam medis dan odontogram untuk tindakan asuhan.' },
              { role: 'admin_staff', desc: 'Akses ke pendaftaran pasien, jadwal, dan billing.' },
              { role: 'patient', desc: 'Akses terbatas ke dashboard personal dan pendaftaran mandiri.' },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-6 p-6 bg-gray-50/50 rounded-3xl border-2 border-gray-100">
                <div className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm">
                  <ChevronRight className="h-4 w-4 text-pop-blue" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-pop-text uppercase tracking-widest italic">{item.role.replace('_', ' ')}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
