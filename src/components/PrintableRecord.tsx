/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Patient, TreatmentRecord } from '../types';
import { TOOTH_STATUS_LABELS } from '../constants';

interface PrintableRecordProps {
  patient: Patient;
  record: any; // Partial<TreatmentRecord>
}

export function PrintableRecord({ patient, record }: PrintableRecordProps) {
  return (
    <div className="hidden print:block p-10 bg-white text-black font-sans">
      <div className="text-center border-b-4 border-black pb-6 mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">DentaCare RME</h1>
        <p className="text-sm font-medium uppercase tracking-widest">Sistem Rekam Medis Elektronik Terintegrasi</p>
        <p className="text-[10px] mt-2">Jl. Kesehatan No. 123, Jakarta | Telp: (021) 1234567</p>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-lg font-bold uppercase border-b border-black mb-4">Data Pasien</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="font-bold w-32">Nama</td><td>: {patient.name}</td></tr>
              <tr><td className="font-bold">No. RM</td><td>: {patient.medicalRecordNumber}</td></tr>
              <tr><td className="font-bold">NIK</td><td>: {patient.nik}</td></tr>
              <tr><td className="font-bold">Tgl Lahir</td><td>: {patient.birthDate}</td></tr>
              <tr><td className="font-bold">Gender</td><td>: {patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase border-b border-black mb-4 text-right">Informasi Rekam Medis</h2>
          <p className="text-sm font-bold">Tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-sm">ID Rekam: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="font-bold uppercase bg-gray-100 p-2 mb-3">I. Anamnesis</h3>
          <div className="pl-4 space-y-2 text-sm">
            <p><span className="font-bold">Keluhan Utama:</span> {record.anamnesis?.mainComplaint}</p>
            <p><span className="font-bold">Riwayat Penyakit Sekarang:</span> {record.anamnesis?.currentIllnessHistory}</p>
            <p><span className="font-bold">Riwayat Penyakit Dahulu:</span> {record.anamnesis?.pastIllnessHistory}</p>
          </div>
        </section>

        <section>
          <h3 className="font-bold uppercase bg-gray-100 p-2 mb-3">II. Pemeriksaan Klinis</h3>
          <div className="pl-4 grid grid-cols-3 gap-4 text-sm">
            <p><span className="font-bold">TD:</span> {record.clinicalExam?.vitalSigns?.bloodPressure} mmHg</p>
            <p><span className="font-bold">Nadi:</span> {record.clinicalExam?.vitalSigns?.pulse} x/mnt</p>
            <p><span className="font-bold">Resp:</span> {record.clinicalExam?.vitalSigns?.respiration} x/mnt</p>
          </div>
        </section>

        <section>
          <h3 className="font-bold uppercase bg-gray-100 p-2 mb-3">III. Odontogram</h3>
          <div className="pl-4 flex flex-wrap gap-2 text-[10px]">
            {Object.entries(record.odontogram || {}).map(([num, status]: [string, any]) => (
              <div key={num} className="border p-1 rounded">
                <span className="font-bold">{num}:</span> {TOOTH_STATUS_LABELS[status as keyof typeof TOOTH_STATUS_LABELS]}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold uppercase bg-gray-100 p-2 mb-3">IV. Diagnosis & Rencana Perawatan</h3>
          <div className="pl-4 space-y-4 text-sm">
            {record.diagnosis?.map((d: any, i: number) => (
              <div key={i} className="border-l-2 border-gray-300 pl-4">
                <p><span className="font-bold">Diagnosis {i+1}:</span> {d.unmetNeeds}</p>
                <p><span className="font-bold">Penyebab:</span> {d.cause}</p>
              </div>
            ))}
            <div className="mt-4">
              <p className="font-bold">Rencana Perawatan:</p>
              <ul className="list-disc pl-5">
                {record.treatmentPlan?.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="text-center">
            <p className="mb-20">Tanda Tangan Pasien</p>
            {record.signature ? (
              <img src={record.signature} alt="Signature" className="h-20 mx-auto mb-2" />
            ) : (
              <div className="h-20" />
            )}
            <p className="font-bold border-t border-black pt-2">{patient.name}</p>
          </div>
          <div className="text-center">
            <p className="mb-20">Dokter Pemeriksa</p>
            <div className="h-20" />
            <p className="font-bold border-t border-black pt-2">Drg. ...........................</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 text-center text-[8px] text-gray-400 pb-4">
        Dicetak secara otomatis oleh DentaCare RME pada {new Date().toLocaleString('id-ID')}
      </div>
    </div>
  );
}
