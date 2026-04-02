/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Filter,
  MoreVertical,
  Download,
  ChevronDown,
  ChevronUp,
  Hash,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Select } from './ui/Select';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, OperationType, handleFirestoreError, Timestamp } from '../firebase';
import { Billing, Patient, BillingItem } from '@/src/types';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { toast } from 'sonner';

export function BillingList() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [billingToDelete, setBillingToDelete] = useState<string | null>(null);
  const [expandedBillingId, setExpandedBillingId] = useState<string | null>(null);

  // Form state for new billing
  const [newBilling, setNewBilling] = useState({
    patientId: '',
    items: [{ description: '', amount: 0 }] as BillingItem[],
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'insurance'>('cash');

  useEffect(() => {
    const unsubscribeBillings = onSnapshot(
      collection(db, 'billings'),
      (snapshot) => {
        const billingData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Billing[];
        setBillings(billingData.sort((a, b) => {
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'billings')
    );

    const unsubscribePatients = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const patientData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Patient[];
        setPatients(patientData);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'patients')
    );

    return () => {
      unsubscribeBillings();
      unsubscribePatients();
    };
  }, []);

  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBilling.patientId || newBilling.items.length === 0) {
      toast.error('Mohon lengkapi data penagihan');
      return;
    }

    const patient = patients.find(p => p.id === newBilling.patientId);
    if (!patient) return;

    const totalAmount = newBilling.items.reduce((sum, item) => sum + item.amount, 0);

    try {
      await addDoc(collection(db, 'billings'), {
        patientId: patient.id,
        patientName: patient.name,
        items: newBilling.items,
        totalAmount,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success('Penagihan berhasil dibuat');
      setIsAddModalOpen(false);
      setNewBilling({ patientId: '', items: [{ description: '', amount: 0 }] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'billings');
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedBilling) return;

    try {
      await updateDoc(doc(db, 'billings', selectedBilling.id), {
        status: 'paid',
        paymentMethod,
        updatedAt: Timestamp.now(),
      });
      
      toast.success(`Pembayaran Berhasil`, {
        description: `Invoice untuk ${selectedBilling.patientName} sebesar ${formatCurrency(selectedBilling.totalAmount)} telah lunas via ${paymentMethod.toUpperCase()}.`,
        duration: 5000,
      });

      setIsPaymentModalOpen(false);
      setSelectedBilling(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'billings');
    }
  };

  const handleDeleteBilling = async () => {
    if (!billingToDelete) return;
    try {
      await deleteDoc(doc(db, 'billings', billingToDelete));
      toast.success('Penagihan berhasil dihapus');
      setIsDeleteModalOpen(false);
      setBillingToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'billings');
    }
  };

  const addItem = () => {
    setNewBilling(prev => ({
      ...prev,
      items: [...prev.items, { description: '', amount: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setNewBilling(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof BillingItem, value: string | number) => {
    setNewBilling(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const filteredBillings = billings.filter(b => {
    const matchesSearch = b.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" className="flex items-center space-x-1"><CheckCircle2 className="h-3 w-3" /> <span>Lunas</span></Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center space-x-1"><Clock className="h-3 w-3" /> <span>Pending</span></Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center space-x-1"><XCircle className="h-3 w-3" /> <span>Dibatalkan</span></Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (date: any) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Billing & <span className="text-pop-blue">Kasir</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Kelola invoice, pembayaran, dan rincian transaksi pasien.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="flex items-center space-x-3 px-8 py-8 rounded-[2rem] shadow-xl shadow-pop-blue/20 hover:scale-105 transition-transform">
          <Plus className="h-6 w-6" />
          <span className="font-black uppercase tracking-widest text-sm">Buat Billing Baru</span>
        </Button>
      </div>

      <Card className="border-2 border-gray-100 bg-pop-card shadow-2xl shadow-gray-200/50 overflow-hidden rounded-[3rem]">
        <CardContent className="p-8 bg-gray-50/30">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Cari nama pasien atau nomor invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 py-8 bg-white border-2 border-gray-100 focus:border-pop-blue focus:ring-pop-blue/20 rounded-[2rem] font-bold text-pop-text shadow-inner"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-[2rem] border-2 border-gray-100 shadow-sm">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 font-black text-[10px] uppercase tracking-widest text-gray-500 w-40"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Lunas</option>
                  <option value="cancelled">Dibatalkan</option>
                </Select>
              </div>
              <Button variant="outline" className="rounded-[2rem] border-2 border-gray-100 h-16 px-8 font-black uppercase tracking-widest text-[10px] hover:border-pop-pink hover:text-pop-pink bg-white shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {filteredBillings.length > 0 ? (
          filteredBillings.map((billing) => {
            const isExpanded = expandedBillingId === billing.id;
            return (
              <Card 
                key={billing.id} 
                className={cn(
                  "group border-2 border-gray-100 bg-pop-card hover:bg-gray-50/50 transition-all duration-300 overflow-hidden rounded-3xl cursor-pointer shadow-lg shadow-gray-200/30",
                  isExpanded && "border-pop-blue/30 shadow-2xl shadow-pop-blue/10"
                )}
                onClick={() => setExpandedBillingId(isExpanded ? null : billing.id)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-5">
                          <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-pop-blue group-hover:bg-pop-blue group-hover:text-white transition-colors duration-300 border-2 border-gray-100">
                            <Receipt className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="font-black text-xl text-pop-text leading-tight">{billing.patientName}</h3>
                            <div className="flex items-center text-sm text-gray-400 font-medium mt-1">
                              <Clock className="h-3 w-3 mr-1.5" />
                              {formatDate(billing.createdAt instanceof Timestamp ? billing.createdAt.toDate() : billing.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(billing.status)}
                          {billing.paymentMethod && (
                            <Badge variant="outline" className="rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider border-pop-purple/20 bg-pop-purple/5 text-pop-purple">
                              {billing.paymentMethod}
                            </Badge>
                          )}
                          <div className="ml-2">
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rincian Tindakan</p>
                          <div className="space-y-2">
                            {billing.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">{item.description}</span>
                                <span className="font-bold text-pop-text">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-gray-50/50 rounded-2xl p-6 flex flex-col justify-center items-end border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Tagihan</p>
                          <p className="text-3xl font-black text-pop-blue tracking-tight">{formatCurrency(billing.totalAmount)}</p>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                  <CreditCard className="h-3 w-3" />
                                  <span>Metode Pembayaran</span>
                                </div>
                                <p className="text-sm font-bold text-pop-text">
                                  {billing.paymentMethod ? (
                                    <span className="capitalize text-pop-purple">{billing.paymentMethod}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">Belum dibayar</span>
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                  <Calendar className="h-3 w-3" />
                                  <span>Waktu Transaksi</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-400">
                                    Dibuat: <span className="text-pop-text font-bold">{formatDateTime(billing.createdAt)}</span>
                                  </p>
                                  <p className="text-xs font-medium text-gray-400">
                                    Update: <span className="text-pop-text font-bold">{formatDateTime(billing.updatedAt)}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                  <Hash className="h-3 w-3" />
                                  <span>ID Transaksi</span>
                                </div>
                                <p className="text-xs font-mono font-bold text-pop-blue bg-gray-50 p-2 rounded-lg border border-gray-100 break-all">
                                  {billing.id}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="bg-gray-50/30 border-t lg:border-t-0 lg:border-l border-gray-100 p-8 flex flex-row lg:flex-col justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {billing.status === 'pending' && (
                        <Button 
                          onClick={() => {
                            setSelectedBilling(billing);
                            setIsPaymentModalOpen(true);
                          }}
                          variant="primary"
                          className="flex-1 font-bold py-6"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Bayar Sekarang
                        </Button>
                      )}
                      <Button variant="outline" className="flex-1 rounded-2xl border-gray-100 font-bold py-6 bg-white hover:border-pop-blue hover:text-pop-blue">
                        <Printer className="h-4 w-4 mr-2" />
                        Cetak Invoice
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-12 w-12 rounded-2xl text-pop-pink hover:bg-pop-pink/10 transition-colors"
                        onClick={() => {
                          setBillingToDelete(billing.id);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-32 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gray-200/50">
              <Receipt className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-pop-text uppercase tracking-wider">Belum Ada Tagihan</h3>
            <p className="text-gray-400 font-medium max-w-sm mx-auto mt-2">
              Semua data penagihan dan invoice akan muncul di sini setelah Anda membuatnya.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="mt-8 rounded-2xl border-gray-100 font-bold px-8 py-6 hover:border-pop-blue hover:text-pop-blue">
              Buat Billing Pertama
            </Button>
          </div>
        )}
      </div>

      {/* Add Billing Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Buat Billing Baru"
        className="max-w-2xl bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl"
      >
        <form onSubmit={handleAddBilling} className="space-y-6 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Pilih Pasien</label>
            <Select
              value={newBilling.patientId}
              onChange={(e) => setNewBilling(prev => ({ ...prev, patientId: e.target.value }))}
              className="bg-gray-50 border-2 border-gray-100 text-pop-text rounded-2xl h-12"
              required
            >
              <option value="" className="bg-white">-- Pilih Pasien --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id} className="bg-white">{p.name} ({p.medicalRecordNumber})</option>
              ))}
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-400">Item Penagihan</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-xl border-gray-100 hover:border-pop-blue hover:text-pop-blue">
                <Plus className="h-3 w-3 mr-1" />
                Tambah Item
              </Button>
            </div>
            
            {newBilling.items.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    placeholder="Deskripsi tindakan/obat"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="bg-gray-50 border-2 border-gray-100 text-pop-text"
                    required
                  />
                </div>
                <div className="w-40">
                  <Input
                    type="number"
                    placeholder="Harga"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                    className="bg-gray-50 border-2 border-gray-100 text-pop-text"
                    required
                  />
                </div>
                {newBilling.items.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-pop-pink mt-1 hover:bg-pop-pink/10"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Total Keseluruhan</p>
              <p className="text-2xl font-bold text-pop-blue">
                {formatCurrency(newBilling.items.reduce((sum, item) => sum + item.amount, 0))}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="border-gray-100">
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Billing
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Proses Pembayaran"
        className="max-w-md bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl"
      >
        <div className="space-y-6 p-4">
          <div className="p-4 bg-pop-blue/5 rounded-2xl border border-pop-blue/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-pop-blue font-medium">Total yang harus dibayar</span>
              <span className="text-lg font-bold text-pop-text">
                {selectedBilling && formatCurrency(selectedBilling.totalAmount)}
              </span>
            </div>
            <p className="text-xs text-gray-400">Pasien: {selectedBilling?.patientName}</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-3">
              {(['cash', 'transfer', 'insurance'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all h-16",
                    paymentMethod === method 
                      ? "border-pop-blue bg-pop-blue/5 text-pop-blue shadow-lg shadow-pop-blue/10" 
                      : "border-gray-100 hover:border-gray-200 text-gray-400"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{method}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" className="flex-1 border-gray-100" onClick={() => setIsPaymentModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleProcessPayment}>
              Konfirmasi Lunas
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus Penagihan"
        className="max-w-md bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl"
      >
        <div className="space-y-4 p-4">
          <p className="text-gray-500">
            Apakah Anda yakin ingin menghapus data penagihan ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="border-gray-100">
              Batal
            </Button>
            <Button variant="danger" onClick={handleDeleteBilling}>
              Hapus Penagihan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
