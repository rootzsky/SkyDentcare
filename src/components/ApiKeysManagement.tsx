/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  RotateCw, 
  Clock, 
  Activity, 
  Code2, 
  Zap, 
  AlertTriangle,
  Play,
  Terminal,
  Layers,
  Lock,
  Calendar,
  X
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
  setDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { ApiKey, ApiKeyRole, ApiKeyScope } from '../types';
import { toast } from 'sonner';

const AVAILABLE_SCOPES: { id: ApiKeyScope; label: string; desc: string; category: string }[] = [
  { id: 'all', label: 'Akses Penuh (Full Super Admin)', desc: 'Hak akses tanpa batas ke seluruh modul sistem', category: 'Super Admin' },
  { id: 'satusehat:fhir', label: 'SATUSEHAT FHIR Bridge', desc: 'Akses interoperabilitas pertukaran data Kemenkes RI', category: 'Super Admin' },
  { id: 'system:admin', label: 'Konfigurasi & Audit Admin', desc: 'Pengaturan sistem, sinkronisasi pengguna dan audit log', category: 'Super Admin' },
  { id: 'patients:read', label: 'Baca Data Pasien', desc: 'Melihat rekam identitas dan profil pasien', category: 'Admin' },
  { id: 'patients:write', label: 'Tulis/Ubah Data Pasien', desc: 'Menambahkan dan memperbarui identitas pasien', category: 'Admin' },
  { id: 'records:read', label: 'Baca Rekam Medis Gigi', desc: 'Membaca riwayat perawatan dan diagnosa ICD-10', category: 'Admin' },
  { id: 'records:write', label: 'Tulis Rekam Medis Gigi', desc: 'Mencatat anamnesa, diagnosis, dan terapi klinis', category: 'Admin' },
  { id: 'odontogram:read', label: 'Baca Odontogram FDI', desc: 'Melihat status 32 gigi FDI dan riwayat restorasi', category: 'Admin' },
  { id: 'odontogram:write', label: 'Ubah Odontogram FDI', desc: 'Memperbarui simbol dan status odontogram', category: 'Admin' },
  { id: 'billing:read', label: 'Baca Faktur / Billing', desc: 'Melihat data tagihan dan rincian tindakan', category: 'Admin' },
  { id: 'billing:write', label: 'Kelola Faktur / Kasir', desc: 'Menerbitkan dan menandai status lunas billing', category: 'Admin' },
  { id: 'analytics:read', label: 'Baca Analisis & Laporan', desc: 'Mengunduh laporan epidemiologi DMF-T dan OHI-S', category: 'Admin' },
];

export function ApiKeysManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [keyName, setKeyName] = useState('');
  const [role, setRole] = useState<ApiKeyRole>('super_admin');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'all',
    'satusehat:fhir',
    'system:admin',
    'patients:read',
    'patients:write'
  ]);
  const [expiryDays, setExpiryDays] = useState<'30' | '90' | '180' | '365' | 'never'>('90');
  const [rateLimit, setRateLimit] = useState<number>(300);

  // One-Time Reveal Modal State
  const [revealedKey, setRevealedKey] = useState<{ name: string; fullKey: string; role: ApiKeyRole } | null>(null);

  // Simulator Modal State
  const [testingKey, setTestingKey] = useState<ApiKey | null>(null);
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/patients?limit=5');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResponse, setSimulationResponse] = useState<any | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'api_keys'));
      const keysList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiKey));
      setApiKeys(keysList);
    } catch (error) {
      console.warn('Could not fetch from firestore, using local fallback:', error);
      // Fallback local memory
      const cached = localStorage.getItem('dentacare_api_keys');
      if (cached) {
        try {
          setApiKeys(JSON.parse(cached));
        } catch (e) {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScopeToggle = (scopeId: ApiKeyScope) => {
    if (scopeId === 'all') {
      if (selectedScopes.includes('all')) {
        setSelectedScopes([]);
      } else {
        setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
      }
      return;
    }

    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId && s !== 'all'));
    } else {
      const next = [...selectedScopes, scopeId];
      if (next.length === AVAILABLE_SCOPES.length - 1) {
        setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
      } else {
        setSelectedScopes(next);
      }
    }
  };

  const handleRoleChange = (newRole: ApiKeyRole) => {
    setRole(newRole);
    if (newRole === 'super_admin') {
      setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
      setRateLimit(1000);
    } else {
      setSelectedScopes([
        'patients:read',
        'patients:write',
        'records:read',
        'records:write',
        'odontogram:read',
        'odontogram:write',
        'billing:read',
        'analytics:read'
      ]);
      setRateLimit(120);
    }
  };

  const generateRandomKey = (prefix = 'dc_live_') => {
    const arr = new Uint8Array(24);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}${hex}`;
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Harap masukkan nama atau identitas klien untuk API Key.');
      return;
    }

    const generatedToken = generateRandomKey(role === 'super_admin' ? 'dc_live_sa_' : 'dc_live_adm_');
    const masked = `${generatedToken.substring(0, 14)}••••••••••••••••${generatedToken.substring(generatedToken.length - 6)}`;
    
    let expiresAt = 'never';
    if (expiryDays !== 'never') {
      const days = parseInt(expiryDays, 10);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    const keyId = `key_${Date.now()}`;
    const newKeyObj: ApiKey = {
      id: keyId,
      name: keyName.trim(),
      keyPrefix: generatedToken.substring(0, 14),
      maskedKey: masked,
      role: role,
      scopes: selectedScopes,
      rateLimit: rateLimit,
      expiresAt: expiresAt,
      status: 'active',
      createdBy: auth.currentUser?.uid || 'super_admin_user',
      creatorEmail: auth.currentUser?.email || 'rudisetiawan935@gmail.com',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'api_keys', keyId), newKeyObj);
      toast.success(`API Key ${role.toUpperCase()} "${keyName}" berhasil dibuat!`);
    } catch (error) {
      console.warn('Error saving to firestore, updating local state:', error);
      toast.info('API Key disimpan di penyimpanan lokal aplikasi.');
    }

    const updated = [newKeyObj, ...apiKeys];
    setApiKeys(updated);
    localStorage.setItem('dentacare_api_keys', JSON.stringify(updated));

    // Show One-Time Reveal Modal
    setRevealedKey({
      name: keyName.trim(),
      fullKey: generatedToken,
      role: role
    });

    // Reset Form
    setIsCreating(false);
    setKeyName('');
  };

  const handleToggleStatus = async (item: ApiKey) => {
    const nextStatus: 'active' | 'revoked' = item.status === 'active' ? 'revoked' : 'active';
    try {
      await updateDoc(doc(db, 'api_keys', item.id), { status: nextStatus });
    } catch (e) {
      // ignore
    }

    const updated = apiKeys.map(k => k.id === item.id ? { ...k, status: nextStatus } : k);
    setApiKeys(updated);
    localStorage.setItem('dentacare_api_keys', JSON.stringify(updated));
    toast.success(`Status API Key diubah menjadi: ${nextStatus === 'active' ? 'Aktif' : 'Dicabut (Revoked)'}`);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus API Key ini secara permanen? Aplikasi yang menggunakan kunci ini akan kehilangan akses.')) return;
    try {
      await deleteDoc(doc(db, 'api_keys', id));
    } catch (e) {
      // ignore
    }

    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem('dentacare_api_keys', JSON.stringify(updated));
    toast.success('API Key berhasil dihapus.');
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Teks berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      if (testEndpoint.includes('satusehat')) {
        setSimulationResponse({
          status: 200,
          statusText: "OK",
          headers: {
            "content-type": "application/fhir+json; charset=utf-8",
            "x-ratelimit-limit": testingKey?.rateLimit || 300,
            "x-ratelimit-remaining": (testingKey?.rateLimit || 300) - 1,
            "x-dentacare-role": testingKey?.role
          },
          data: {
            resourceType: "Bundle",
            type: "searchset",
            total: 100,
            meta: {
              lastUpdated: new Date().toISOString()
            },
            entry: [
              {
                fullUrl: "urn:uuid:pat-100-001",
                resource: {
                  resourceType: "Patient",
                  id: "RM-2026-0001",
                  identifier: [{ system: "https://fhir.kemkes.go.id/id/nik", value: "3171015502180001" }],
                  name: [{ text: "Muhammad Rizky Pratama" }],
                  gender: "male",
                  birthDate: "2018-05-14"
                }
              }
            ]
          }
        });
      } else {
        setSimulationResponse({
          status: 200,
          statusText: "OK",
          headers: {
            "content-type": "application/json; charset=utf-8",
            "x-ratelimit-limit": testingKey?.rateLimit || 300,
            "x-ratelimit-remaining": (testingKey?.rateLimit || 300) - 1,
            "x-dentacare-role": testingKey?.role
          },
          data: {
            success: true,
            role_authorized: testingKey?.role,
            scopes_validated: testingKey?.scopes,
            results_count: 5,
            message: "Akses API berhasil diautentikasi dengan token valid."
          }
        });
      }
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Explainer */}
      <div className="bg-gradient-to-r from-pop-blue/10 via-pop-purple/10 to-pop-pink/10 border-2 border-pop-blue/20 p-8 rounded-[2.5rem] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl shadow-pop-blue/5">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pop-blue text-white rounded-2xl shadow-lg shadow-pop-blue/20">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">
              Manajemen API Keys (Super Admin & Admin)
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-bold leading-relaxed">
            Hasilkan token otentikasi REST API dan interoperabilitas SATUSEHAT Kemenkes RI untuk menghubungkan modul DentaCare dengan aplikasi eksternal, laboratorium dental, SIMRS, atau aplikasi mobile pasien.
          </p>
        </div>
        
        <Button
          variant="primary"
          onClick={() => setIsCreating(!isCreating)}
          className="px-8 py-6 rounded-2xl shadow-xl shadow-pop-blue/20 font-black uppercase tracking-widest text-xs shrink-0"
        >
          {isCreating ? <X className="h-5 w-5 mr-3" /> : <Plus className="h-5 w-5 mr-3" />}
          {isCreating ? 'Tutup Formulir' : 'Buat API Key Baru'}
        </Button>
      </div>

      {/* Create Key Form */}
      {isCreating && (
        <Card className="border-2 border-pop-blue/30 bg-white shadow-2xl rounded-[3rem] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-pop-blue/5 border-b border-pop-blue/10 p-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">
                  Generate API Key Baru
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">
                  Tentukan peran, hak akses (scopes), masa kedaluwarsa, dan pembatasan laju request.
                </CardDescription>
              </div>
              <Badge variant="blue" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                Standar OAuth 2.0 / Bearer
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleCreateApiKey} className="space-y-8">
              {/* Row 1: Name & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">
                    Nama Klien / Tujuan Penggunaan <span className="text-pop-pink">*</span>
                  </label>
                  <Input 
                    required
                    placeholder="Contoh: SATUSEHAT Kemenkes Bridge / Mobile App Patient"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="h-14 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue font-bold text-xs"
                  />
                  <p className="text-[10px] text-gray-400 italic ml-2">Identitas deskriptif untuk memudahkan audit penggunaan.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">
                    Tingkat Peran (Role Module) <span className="text-pop-pink">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('super_admin')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        role === 'super_admin'
                          ? 'border-pop-purple bg-pop-purple/10 text-pop-purple shadow-lg shadow-pop-purple/10'
                          : 'border-gray-100 bg-gray-50/50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs uppercase tracking-wider">Super Admin</span>
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold mt-2 opacity-80">
                        Akses Penuh, SATUSEHAT & Bypass
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('admin')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        role === 'admin'
                          ? 'border-pop-blue bg-pop-blue/10 text-pop-blue shadow-lg shadow-pop-blue/10'
                          : 'border-gray-100 bg-gray-50/50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs uppercase tracking-wider">Admin</span>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold mt-2 opacity-80">
                        Operasional Pasien & Odontogram
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Expiration & Rate Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">
                    Masa Berlaku Kunci (Expiry)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { val: '30', label: '30 Hari' },
                      { val: '90', label: '90 Hari' },
                      { val: '180', label: '180 Hari' },
                      { val: '365', label: '1 Tahun' },
                      { val: 'never', label: 'Selamanya' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setExpiryDays(opt.val as any)}
                        className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                          expiryDays === opt.val
                            ? 'border-pop-blue bg-pop-blue text-white shadow-md shadow-pop-blue/20'
                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">
                    Batas Panggilan / Rate Limit
                  </label>
                  <select
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-6 focus:ring-4 focus:ring-pop-blue/10 focus:border-pop-blue text-xs font-bold text-pop-text outline-none"
                  >
                    <option value={60}>60 Permintaan / menit (Standar Ringan)</option>
                    <option value={120}>120 Permintaan / menit (Admin Operasional)</option>
                    <option value={300}>300 Permintaan / menit (Integrasi SIMRS)</option>
                    <option value={1000}>1,000 Permintaan / menit (Super Admin High Volume)</option>
                    <option value={5000}>5,000 Permintaan / menit (SATUSEHAT Batch Sync)</option>
                  </select>
                </div>
              </div>

              {/* Scopes Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 italic">
                    Pilih Hak Akses API (Scopes)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedScopes.length === AVAILABLE_SCOPES.length) {
                        setSelectedScopes([]);
                      } else {
                        setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
                      }
                    }}
                    className="text-[10px] font-black text-pop-blue uppercase tracking-widest hover:underline"
                  >
                    {selectedScopes.length === AVAILABLE_SCOPES.length ? 'Batalkan Semua' : 'Pilih Semua Scope'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AVAILABLE_SCOPES.map(sc => {
                    const isSelected = selectedScopes.includes(sc.id) || selectedScopes.includes('all');
                    return (
                      <div
                        key={sc.id}
                        onClick={() => handleScopeToggle(sc.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-pop-blue bg-pop-blue/5 text-pop-text shadow-sm'
                            : 'border-gray-100 bg-gray-50/30 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-colors ${
                            isSelected ? 'bg-pop-blue border-pop-blue text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight">{sc.label}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{sc.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Action */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  className="px-8 py-6 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="px-10 py-6 rounded-2xl shadow-xl shadow-pop-blue/20 text-xs font-black uppercase tracking-widest"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Kunci Sekarang
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* One-Time Reveal Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full border-4 border-pop-purple shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pop-purple text-white rounded-2xl shadow-lg shadow-pop-purple/20">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                    API Key Berhasil Dibuat!
                  </h3>
                  <p className="text-[10px] font-black text-pop-purple uppercase tracking-widest mt-1">
                    Modul: {revealedKey.role === 'super_admin' ? 'SUPER ADMIN (Akses Penuh)' : 'ADMIN KLINIK'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 leading-relaxed font-bold">
                PENTING: Salin dan simpan kunci rahasia ini sekarang di tempat aman. Demi alasan keamanan, kunci lengkap ini <span className="underline">TIDAK AKAN DITAMPILKAN LAGI</span> setelah jendela ini ditutup.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">
                Kunci Rahasia API ({revealedKey.name})
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={revealedKey.fullKey}
                  className="font-mono text-xs font-black bg-gray-50 border-2 border-gray-200 h-14 rounded-2xl px-4 text-pop-text select-all"
                />
                <Button
                  onClick={() => handleCopyText(revealedKey.fullKey, 'revealed')}
                  className="h-14 px-6 rounded-2xl bg-pop-purple text-white hover:bg-pop-purple/90 shrink-0 font-black text-xs uppercase tracking-wider"
                >
                  {copiedId === 'revealed' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5 mr-2" />}
                  {copiedId === 'revealed' ? 'Tersalin' : 'Salin Kunci'}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-gray-900 rounded-2xl text-gray-200 font-mono text-[10px] overflow-x-auto">
              <p className="text-gray-400 mb-2"># Contoh cURL Penggunaan:</p>
              <code>
                curl -X GET "https://ais-dev-iz4n7ak3nfzocfnvczq7my-492065102666.asia-east1.run.app/api/v1/patients" \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer {revealedKey.fullKey}" \<br />
                &nbsp;&nbsp;-H "Accept: application/json"
              </code>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={() => setRevealedKey(null)}
                className="px-8 py-6 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-pop-blue/20"
              >
                Saya Sudah Menyimpan Kunci Ini
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {testingKey && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-3xl w-full border-2 border-gray-100 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pop-blue text-white rounded-2xl">
                  <Terminal className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-pop-text uppercase italic tracking-tight">
                    API Key Simulator & Debugger
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                    Menguji otentikasi untuk: <span className="text-pop-blue">{testingKey.name}</span> ({testingKey.role.toUpperCase()})
                  </p>
                </div>
              </div>
              <button onClick={() => setTestingKey(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase">Role Level</p>
                <p className="text-xs font-black text-pop-text uppercase mt-1">{testingKey.role}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase">Rate Limit</p>
                <p className="text-xs font-black text-pop-text uppercase mt-1">{testingKey.rateLimit} req/min</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase">Status</p>
                <Badge variant={testingKey.status === 'active' ? 'green' : 'pink'} className="mt-1">
                  {testingKey.status === 'active' ? 'Aktif' : 'Revoked'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">
                Pilih Target Endpoint Simulasi
              </label>
              <div className="flex gap-2">
                <select
                  value={testEndpoint}
                  onChange={(e) => {
                    setTestEndpoint(e.target.value);
                    setSimulationResponse(null);
                  }}
                  className="flex-1 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-xs font-mono font-bold text-pop-text outline-none"
                >
                  <option value="/api/v1/patients?limit=5">GET /api/v1/patients?limit=5 (Daftar Pasien)</option>
                  <option value="/api/v1/odontogram/36">GET /api/v1/odontogram/36 (Status Odontogram FDI)</option>
                  <option value="/api/v1/billing/summary">GET /api/v1/billing/summary (Laporan Tagihan Kasir)</option>
                  <option value="/api/v1/satusehat/bundle/fhir">GET /api/v1/satusehat/bundle/fhir (SATUSEHAT FHIR R4)</option>
                </select>
                <Button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="h-14 px-8 rounded-2xl bg-pop-blue text-white hover:bg-pop-blue/90 font-black text-xs uppercase tracking-wider shadow-lg shadow-pop-blue/20"
                >
                  {isSimulating ? <RotateCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                  {isSimulating ? 'Memproses...' : 'Kirim Request'}
                </Button>
              </div>
            </div>

            {simulationResponse && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Response Payload (HTTP 200 OK)</span>
                  <span className="text-[10px] font-black text-pop-green uppercase tracking-widest">Latency: 42ms</span>
                </div>
                <div className="bg-gray-950 p-6 rounded-2xl text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-gray-800">
                  <pre>{JSON.stringify(simulationResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Keys Table / Cards */}
      <Card className="border-2 border-gray-100 bg-white shadow-xl rounded-[3rem] overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-black text-pop-text uppercase italic tracking-tight">
              Daftar API Keys Terdaftar
            </CardTitle>
            <p className="text-[10px] text-gray-400 font-black mt-2 uppercase tracking-[0.3em]">
              Total Kunci: {apiKeys.length} Kunci ({apiKeys.filter(k => k.role === 'super_admin').length} Super Admin, {apiKeys.filter(k => k.role === 'admin').length} Admin)
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={fetchApiKeys}
            className="flex items-center gap-2 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest border border-gray-200"
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">
              Memuat data API Keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <Key className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                Belum ada API Key yang dibuat.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsCreating(true)}
                className="rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-widest"
              >
                Buat API Key Pertama
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {apiKeys.map(k => (
                <div key={k.id} className="p-8 hover:bg-gray-50/50 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-black text-base text-pop-text tracking-tight uppercase">
                        {k.name}
                      </span>
                      <Badge 
                        variant={k.role === 'super_admin' ? 'purple' : 'blue'}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1"
                      >
                        {k.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                      <Badge
                        variant={k.status === 'active' ? 'green' : 'pink'}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1"
                      >
                        {k.status === 'active' ? 'Aktif' : 'Dicabut'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-black">{k.maskedKey}</span>
                        <button
                          onClick={() => handleCopyText(k.keyPrefix, k.id)}
                          title="Salin Prefix Kunci"
                          className="hover:text-pop-blue transition-colors ml-1"
                        >
                          {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-pop-green" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-gray-400 font-sans text-[10px] font-bold">
                        <Activity className="h-3.5 w-3.5" />
                        <span>{k.rateLimit} req/mnt</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-gray-400 font-sans text-[10px] font-bold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {k.expiresAt === 'never' ? 'Tanpa Kedaluwarsa' : `Kedaluwarsa: ${new Date(k.expiresAt).toLocaleDateString('id-ID')}`}
                        </span>
                      </div>
                    </div>

                    {/* Scopes Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {k.scopes.map(s => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[8px] font-mono font-bold tracking-tight uppercase"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => setTestingKey(k)}
                      className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <Terminal className="h-4 w-4 mr-1.5 text-pop-blue" />
                      Test Simulasi
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleStatus(k)}
                      className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest border ${
                        k.status === 'active'
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-pop-green/30 text-pop-green hover:bg-pop-green/10'
                      }`}
                    >
                      {k.status === 'active' ? 'Cabut Akses' : 'Aktifkan Kembali'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteKey(k.id)}
                      className="rounded-xl p-3 text-gray-400 hover:text-pop-pink hover:bg-pop-pink/10 transition-colors"
                      title="Hapus API Key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Developer Documentation Box */}
      <Card className="border-2 border-gray-100 bg-gray-50/50 rounded-[3rem] p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Code2 className="h-5 w-5 text-pop-purple" />
            <h4 className="text-base font-black text-pop-text uppercase italic tracking-tight">
              Panduan Integrasi Pengembang (API Developer Quickstart)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
            <div className="space-y-2">
              <p className="font-bold text-pop-text uppercase text-[10px] tracking-widest">Format Autentikasi HTTP Header</p>
              <div className="p-4 bg-gray-950 text-gray-200 rounded-2xl font-mono text-[10px]">
                Authorization: Bearer dc_live_sa_xxxxxxxxxxxxxxxx<br />
                Content-Type: application/json<br />
                X-Client-ID: dentacare-bridge-2026
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-pop-text uppercase text-[10px] tracking-widest">Daftar Endpoint Utama</p>
              <ul className="space-y-1 text-[11px] font-mono">
                <li><span className="text-pop-blue font-bold">GET</span> /api/v1/patients - Identitas 100 Pasien</li>
                <li><span className="text-pop-green font-bold">POST</span> /api/v1/odontogram - Update Status Gigi FDI</li>
                <li><span className="text-pop-purple font-bold">GET</span> /api/v1/satusehat/fhir - Resource FHIR Kemenkes</li>
                <li><span className="text-amber-600 font-bold">GET</span> /api/v1/reports/epidemiology - Indeks DMF-T & OHI-S</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
