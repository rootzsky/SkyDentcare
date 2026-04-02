/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  Settings, 
  Database,
  Search,
  Edit,
  Trash2,
  Mail,
  User as UserIcon,
  AlertTriangle,
  Plus,
  X,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { ROLES } from '@/src/constants';
import { 
  db, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  OperationType, 
  handleFirestoreError, 
  Timestamp,
  setDoc
} from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

export function MasterData() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'admin_staff' as UserRole
  });

  const [addFormData, setAddFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'admin_staff' as UserRole
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const userList = snapshot.docs.map(doc => ({
          ...doc.data()
        })) as UserProfile[];
        setUsers(userList);
        setIsLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    return () => unsubscribe();
  }, []);

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      email: user.email,
      role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      toast.success('Pengguna berhasil dihapus');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete}`);
      toast.error('Gagal menghapus pengguna');
    }
  };

  const confirmDelete = (uid: string) => {
    setUserToDelete(uid);
    setIsDeleteModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.displayName || !addFormData.email || !addFormData.password || !addFormData.role) {
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
        addFormData.email, 
        addFormData.password
      );
      
      const newUser: UserProfile = {
        uid: userCredential.user.uid,
        email: addFormData.email,
        displayName: addFormData.displayName,
        role: addFormData.role,
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', newUser.uid), newUser);
      
      await signOut(secondaryAuth);
      
      setIsAddModalOpen(false);
      setAddFormData({
        displayName: '',
        email: '',
        password: '',
        role: 'admin_staff' as UserRole
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        role: formData.role,
        updatedAt: Timestamp.now()
      });
      toast.success('Data pengguna diperbarui');
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
      toast.error('Gagal memperbarui pengguna');
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Data Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Kelola pengguna, hak akses, dan konfigurasi sistem.</p>
        </div>
        <Button 
          variant="primary"
          className="px-8 py-7 rounded-2xl group transition-all duration-500 shadow-xl shadow-pop-blue/20" 
          onClick={() => setIsAddModalOpen(true)}
        >
          <UserPlus className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-black uppercase tracking-widest text-xs">Tambah Pengguna</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-[2.5rem] border-2 border-gray-100 space-y-2 shadow-xl shadow-gray-200/50">
            <Button variant="ghost" className="w-full justify-start space-x-4 bg-pop-blue/5 text-pop-blue border-2 border-pop-blue/10 px-6 py-8 rounded-2xl font-black uppercase tracking-widest text-[10px] italic">
              <Shield className="h-5 w-5" />
              <span>Manajemen User</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start space-x-4 text-gray-400 hover:bg-gray-50 hover:text-pop-text px-6 py-8 rounded-2xl font-black uppercase tracking-widest text-[10px] italic transition-all">
              <Database className="h-5 w-5" />
              <span>Data Institusi</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start space-x-4 text-gray-400 hover:bg-gray-50 hover:text-pop-text px-6 py-8 rounded-2xl font-black uppercase tracking-widest text-[10px] italic transition-all">
              <Settings className="h-5 w-5" />
              <span>Konfigurasi API</span>
            </Button>
          </div>

          <div className="p-6 bg-pop-yellow/5 rounded-[2rem] border-2 border-pop-yellow/10">
            <div className="flex items-center space-x-3 text-pop-yellow mb-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Peringatan</span>
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
              Perubahan role pengguna akan berdampak langsung pada hak akses mereka di seluruh modul sistem.
            </p>
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-8">
          <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                <div>
                  <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Daftar Pengguna</CardTitle>
                  <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">Total: {users.length} Akun Terdaftar</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    placeholder="Cari nama atau email..." 
                    className="pl-14 py-8 bg-white border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-[10px] shadow-lg shadow-gray-200/50" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Nama & Email</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Role Akses</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Status</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center space-y-6">
                            <div className="h-12 w-12 border-4 border-pop-blue border-t-transparent rounded-full animate-spin shadow-lg shadow-pop-blue/20" />
                            <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] italic">Memuat data...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.uid} className="group hover:bg-gray-50/50 transition-all duration-300">
                          <td className="px-10 py-8">
                            <div className="flex items-center space-x-6">
                              <div className="h-16 w-16 rounded-[1.5rem] bg-gray-50 border-2 border-gray-100 flex items-center justify-center text-pop-blue font-black text-2xl group-hover:bg-pop-blue group-hover:text-white transition-all duration-500 shadow-lg shadow-gray-200/50">
                                {user.displayName.charAt(0)}
                              </div>
                              <div>
                                <div className="text-lg font-black text-pop-text leading-tight uppercase italic tracking-tight group-hover:text-pop-blue transition-colors">{user.displayName}</div>
                                <div className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <Badge variant="outline" className="bg-pop-blue/5 text-pop-blue border-pop-blue/10 rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest">
                              {ROLES[user.role as keyof typeof ROLES] || user.role.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-10 py-8">
                            <div className="flex items-center space-x-3">
                              <div className="h-2.5 w-2.5 rounded-full bg-pop-green shadow-lg shadow-pop-green/20 animate-pulse" />
                              <span className="text-[10px] font-black text-pop-green uppercase tracking-widest italic">Aktif</span>
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(user)} 
                                className="h-12 w-12 rounded-2xl hover:bg-pop-blue/5 hover:text-pop-blue border-2 border-transparent hover:border-pop-blue/10 transition-all"
                              >
                                <Edit className="h-5 w-5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => confirmDelete(user.uid)} 
                                className="h-12 w-12 rounded-2xl hover:bg-rose-50 hover:text-rose-500 border-2 border-transparent hover:border-rose-100 transition-all"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-10 py-32 text-center">
                          <div className="max-w-xs mx-auto space-y-6">
                            <div className="bg-gray-50 h-24 w-24 rounded-[2.5rem] border-2 border-gray-100 flex items-center justify-center mx-auto shadow-xl shadow-gray-200/50">
                              <Search className="h-10 w-10 text-gray-300" />
                            </div>
                            <div>
                              <p className="text-pop-text font-black text-xl uppercase italic tracking-tight">Tidak ditemukan</p>
                              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Coba gunakan kata kunci pencarian lain.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus"
        className="max-w-md bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl"
      >
        <div className="p-10 space-y-10">
          <div className="h-24 w-24 bg-rose-50 rounded-[2.5rem] border-2 border-rose-100 flex items-center justify-center mx-auto shadow-xl shadow-rose-100/50">
            <AlertTriangle className="h-12 w-12 text-rose-500" />
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-black text-pop-text uppercase italic tracking-tighter">Hapus Pengguna?</h3>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest leading-relaxed">Tindakan ini tidak dapat dibatalkan. Akses pengguna ini akan dicabut sepenuhnya dari sistem.</p>
          </div>
          <div className="flex flex-col gap-4 pt-4">
            <Button 
              variant="danger" 
              className="w-full py-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/20" 
              onClick={handleDelete}
            >
              Ya, Hapus Permanen
            </Button>
            <Button 
              variant="ghost" 
              className="w-full py-8 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-gray-100 hover:bg-gray-50" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Batalkan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Pengguna"
        className="max-w-lg bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Nama Lengkap</label>
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input 
                  className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs shadow-inner"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Email (Read-only)</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-300" />
                <Input 
                  className="pl-14 py-8 bg-gray-50/50 border-2 border-gray-100 rounded-2xl font-black text-gray-300 uppercase tracking-widest text-xs cursor-not-allowed"
                  value={formData.email} 
                  disabled 
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Role Akses</label>
              <div className="relative">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 z-10" />
                <Select 
                  className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs appearance-none shadow-inner"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value="admin" className="bg-white">Administrator</option>
                  <option value="dentist" className="bg-white">Dokter Gigi</option>
                  <option value="dental_therapist" className="bg-white">Terapis Gigi</option>
                  <option value="admin_staff" className="bg-white">Staf Administrasi</option>
                  <option value="patient" className="bg-white">Pasien</option>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button 
              type="button" 
              variant="ghost" 
              className="flex-1 py-8 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-gray-100 hover:bg-gray-50" 
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              className="flex-1 py-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pop-blue/20"
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Pengguna Baru"
        className="max-w-lg bg-white border-2 border-gray-100 rounded-[3rem] shadow-2xl"
      >
        <form onSubmit={handleAddUser} className="p-10 space-y-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Nama Lengkap</label>
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input 
                  className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs shadow-inner"
                  value={addFormData.displayName}
                  onChange={(e) => setAddFormData({...addFormData, displayName: e.target.value})}
                  placeholder="Contoh: Drg. Budi Santoso"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Email Institusi</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input 
                  type="email"
                  className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs shadow-inner"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                  placeholder="email@dentacare.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input 
                  type={showPassword ? "text" : "password"}
                  className="pl-14 pr-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs shadow-inner"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({...addFormData, password: e.target.value})}
                  placeholder="Min. 6 karakter"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pop-blue transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1 italic">Role Akses</label>
              <div className="relative">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 z-10" />
                <Select 
                  className="pl-14 py-8 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-black text-pop-text uppercase tracking-widest text-xs appearance-none shadow-inner"
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({...addFormData, role: e.target.value as UserRole})}
                >
                  <option value="admin" className="bg-white">Administrator</option>
                  <option value="dentist" className="bg-white">Dokter Gigi</option>
                  <option value="dental_therapist" className="bg-white">Terapis Gigi</option>
                  <option value="admin_staff" className="bg-white">Staf Administrasi</option>
                  <option value="patient" className="bg-white">Pasien</option>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button 
              type="button" 
              variant="ghost" 
              className="flex-1 py-8 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-gray-100 hover:bg-gray-50" 
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 py-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pop-blue/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-3 inline-block" />
                  Simpan Pengguna
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
