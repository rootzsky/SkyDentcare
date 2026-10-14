/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { DentalPatient100, dummy100Patients, compute100PatientsAnalytics, dummyFollowUpPrograms } from '../data/dummy100Patients';

/**
 * Helper to map categorical variables to numeric SPSS codes and labels
 */
export function getPatientSpssRow(p: DentalPatient100, index: number) {
  // Gender: 1=Laki-laki, 2=Perempuan
  const genderCode = p.gender === 'L' ? 1 : 2;

  // Age Group: 1=pediatrik, 2=remaja, 3=dewasa_muda, 4=dewasa, 5=lansia
  const ageGroupMap: Record<string, { code: number; label: string }> = {
    'pediatrik': { code: 1, label: 'Pediatrik (5-12 thn)' },
    'remaja': { code: 2, label: 'Remaja (13-18 thn)' },
    'dewasa_muda': { code: 3, label: 'Dewasa Muda (19-35 thn)' },
    'dewasa': { code: 4, label: 'Dewasa (36-50 thn)' },
    'lansia': { code: 5, label: 'Lansia (51-76 thn)' }
  };
  const ageGroupInfo = ageGroupMap[p.ageGroup] || { code: 4, label: 'Dewasa' };

  // WHO DMFT Category: 1=Sangat Rendah, 2=Rendah, 3=Sedang, 4=Tinggi, 5=Sangat Tinggi
  const dmftCatMap: Record<string, { code: number; label: string }> = {
    'Sangat Rendah': { code: 1, label: 'Sangat Rendah (< 1.2)' },
    'Rendah': { code: 2, label: 'Rendah (1.2 - 2.6)' },
    'Sedang': { code: 3, label: 'Sedang (2.7 - 4.4)' },
    'Tinggi': { code: 4, label: 'Tinggi (4.5 - 6.5)' },
    'Sangat Tinggi': { code: 5, label: 'Sangat Tinggi (> 6.5)' }
  };
  const dmftInfo = dmftCatMap[p.dmft.category] || { code: 4, label: 'Tinggi' };

  // OHI-S Category: 1=Baik (0-1.2), 2=Sedang (1.3-3.0), 3=Buruk (3.1-6.0)
  const ohisCatMap: Record<string, { code: number; label: string }> = {
    'Baik': { code: 1, label: 'Baik (0.0 - 1.2)' },
    'Sedang': { code: 2, label: 'Sedang (1.3 - 3.0)' },
    'Buruk': { code: 3, label: 'Buruk (3.1 - 6.0)' }
  };
  const ohisInfo = ohisCatMap[p.ohis.category] || { code: 2, label: 'Sedang' };

  // Periodontal Status: 1=Sehat, 2=Gingivitis Marginalis, 3=Gingivitis Kronis, 4=Periodontitis Ringan, 5=Periodontitis Kronis
  let perioCode = 2;
  const perioStr = p.periodontalStatus || '';
  if (perioStr.includes('Sehat')) perioCode = 1;
  else if (perioStr.includes('Marginalis')) perioCode = 2;
  else if (perioStr.includes('Gingivitis Kronis')) perioCode = 3;
  else if (perioStr.includes('Ringan')) perioCode = 4;
  else if (perioStr.includes('Sedang-Berat') || perioStr.includes('Kronis')) perioCode = 5;

  // Blood Type: 1=A, 2=B, 3=AB, 4=O
  const bloodMap: Record<string, number> = { 'A': 1, 'B': 2, 'AB': 3, 'O': 4 };
  const bloodCode = bloodMap[p.bloodType] || 1;

  // Insurance: 1=BPJS Kesehatan, 2=Mandiri Inhealth, 3=Prudential, 4=Umum/Mandiri
  const insMap: Record<string, number> = {
    'BPJS Kesehatan': 1,
    'Mandiri Inhealth': 2,
    'Prudential': 3,
    'Umum/Mandiri': 4
  };
  const insCode = insMap[p.insurance] || 1;

  // City: 1=Jakarta, 2=Surabaya, 3=Bandung, 4=Medan, 5=Semarang, 6=Yogyakarta, 7=Denpasar, 8=Makassar
  const cityMap: Record<string, number> = {
    'Jakarta': 1,
    'Surabaya': 2,
    'Bandung': 3,
    'Medan': 4,
    'Semarang': 5,
    'Yogyakarta': 6,
    'Denpasar': 7,
    'Makassar': 8
  };
  const cityCode = cityMap[p.city] || 1;

  // Systemic condition coding
  let sysCode = 0;
  const sysLower = (p.systemicConditions || '').toLowerCase();
  if (sysLower.includes('tidak ada') || sysLower === '-') sysCode = 0;
  else if (sysLower.includes('diabetes')) sysCode = 1;
  else if (sysLower.includes('hipertensi')) sysCode = 2;
  else if (sysLower.includes('jantung')) sysCode = 3;
  else if (sysLower.includes('hamil') || sysLower.includes('gravidarum')) sysCode = 4;
  else if (sysLower.includes('asma')) sysCode = 5;
  else sysCode = 6;

  // Extract ICD-10 Code from primary diagnosis e.g. "Karies Dentin Profunda (K02.1)" -> "K02.1"
  const icdMatch = p.primaryDiagnosis.match(/\(([A-Z][0-9]{2}(\.[0-9]+)?)\)/);
  const icd10Code = icdMatch ? icdMatch[1] : 'K02.9';

  return {
    // SPSS Variable Names (Compliant with SPSS syntax: alphanumeric, no spaces, starts with letter)
    ID_PASIEN: index + 1,
    NO_RM: p.medicalRecordNumber,
    NIK: p.nik,
    NAMA_PASIEN: p.name,
    KELAMIN: genderCode, // 1=Laki-laki, 2=Perempuan
    KELAMIN_STR: p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    USIA: p.age,
    KAT_USIA: ageGroupInfo.code, // 1-5
    KAT_USIA_STR: ageGroupInfo.label,
    D_DECAY: p.dmft.decay,
    M_MISSING: p.dmft.missing,
    F_FILLED: p.dmft.filled,
    DMFT_TOTAL: p.dmft.total,
    DMFT_KAT: dmftInfo.code, // 1-5
    DMFT_KAT_STR: dmftInfo.label,
    DEBRIS_IND: p.ohis.debrisIndex,
    CALCULUS_IND: p.ohis.calculusIndex,
    OHIS_TOTAL: p.ohis.totalScore,
    OHIS_KAT: ohisInfo.code, // 1=Baik, 2=Sedang, 3=Buruk
    OHIS_KAT_STR: ohisInfo.label,
    PLAK_INDEKS: p.plaqueIndex,
    STATUS_PERIO: perioCode, // 1-5
    STATUS_PERIO_STR: p.periodontalStatus,
    JML_GIGI_TERDAMPAK: p.affectedTeeth ? p.affectedTeeth.length : 0,
    DAFTAR_GIGI_FDI: p.affectedTeeth ? p.affectedTeeth.join(', ') : '-',
    KODE_ICD10: icd10Code,
    DIAGNOSIS_UTAMA: p.primaryDiagnosis,
    KONDISI_SISTEMIK_KODE: sysCode,
    KONDISI_SISTEMIK: p.systemicConditions,
    GOL_DARAH_KODE: bloodCode,
    GOL_DARAH: p.bloodType,
    ASURANSI_KODE: insCode,
    ASURANSI: p.insurance,
    KOTA_KODE: cityCode,
    KOTA: p.city,
    ALAMAT: p.address,
    NO_TELEPON: p.phone,
    BIAYA_ESTIMASI: p.billingTotal,
    TINDAKAN_REKOMENDASI: p.recommendedTreatment,
    TINDAKAN_TERAKHIR: p.lastTreatment,
    TGL_REGISTRASI: p.registrationDate,
    TGL_KUNJUNGAN_TERAKHIR: p.lastVisitDate
  };
}

/**
 * Build the complete SPSS Variable Dictionary / Codebook
 */
export function buildSpssCodebook() {
  return [
    {
      NO: 1,
      NAMA_VARIABEL_SPSS: 'ID_PASIEN',
      LABEL_VARIABEL: 'Nomor Identifikasi Pasien (1-100)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: 'Integer unik 1 sampai 100',
      KETERANGAN_METODOLOGI: 'Identifier data penelitian'
    },
    {
      NO: 2,
      NAMA_VARIABEL_SPSS: 'NO_RM',
      LABEL_VARIABEL: 'Nomor Rekam Medis Elektronik (RME)',
      TIPE_DATA: 'String',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: 'Format: RM-2026-XXXX',
      KETERANGAN_METODOLOGI: 'Standar penomoran RME Permenkes 24/2022'
    },
    {
      NO: 3,
      NAMA_VARIABEL_SPSS: 'NIK',
      LABEL_VARIABEL: 'Nomor Induk Kependudukan (16 Digit)',
      TIPE_DATA: 'String',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '16 digit angka kependudukan Dukcapil',
      KETERANGAN_METODOLOGI: 'Identifikasi tunggal SATUSEHAT Kemenkes'
    },
    {
      NO: 4,
      NAMA_VARIABEL_SPSS: 'NAMA_PASIEN',
      LABEL_VARIABEL: 'Nama Lengkap Pasien',
      TIPE_DATA: 'String',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: 'Nama lengkap responden/pasien',
      KETERANGAN_METODOLOGI: 'Data demografi pasien'
    },
    {
      NO: 5,
      NAMA_VARIABEL_SPSS: 'KELAMIN',
      LABEL_VARIABEL: 'Jenis Kelamin Pasien (Dikotomis)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Laki-laki; 2 = Perempuan',
      KETERANGAN_METODOLOGI: 'Variabel independen kategorik (Uji Chi-Square / T-Test)'
    },
    {
      NO: 6,
      NAMA_VARIABEL_SPSS: 'USIA',
      LABEL_VARIABEL: 'Usia Kronologis Pasien (Tahun)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale (Rasio)',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu (Tahun), Rentang 5 - 76',
      KETERANGAN_METODOLOGI: 'Uji Normalitas, Regresi Linier, Pearson Correlation'
    },
    {
      NO: 7,
      NAMA_VARIABEL_SPSS: 'KAT_USIA',
      LABEL_VARIABEL: 'Kategori Kelompok Usia Pasien',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Ordinal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Pediatrik (5-12 th); 2 = Remaja (13-18 th); 3 = Dewasa Muda (19-35 th); 4 = Dewasa (36-50 th); 5 = Lansia (51-76 th)',
      KETERANGAN_METODOLOGI: 'Uji ANOVA / Kruskal-Wallis antar kelompok umur'
    },
    {
      NO: 8,
      NAMA_VARIABEL_SPSS: 'D_DECAY',
      LABEL_VARIABEL: 'Jumlah Gigi Berlubang / Karies Aktif (Decayed)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale (Rasio)',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu cacah 0 - 12 gigi',
      KETERANGAN_METODOLOGI: 'Komponen D dari Indeks DMF-T WHO'
    },
    {
      NO: 9,
      NAMA_VARIABEL_SPSS: 'M_MISSING',
      LABEL_VARIABEL: 'Jumlah Gigi Hilang / Dicabut Karena Karies (Missing)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale (Rasio)',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu cacah 0 - 14 gigi',
      KETERANGAN_METODOLOGI: 'Komponen M dari Indeks DMF-T WHO'
    },
    {
      NO: 10,
      NAMA_VARIABEL_SPSS: 'F_FILLED',
      LABEL_VARIABEL: 'Jumlah Gigi Ditambal Tanpa Karies Sekunder (Filled)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale (Rasio)',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu cacah 0 - 8 gigi',
      KETERANGAN_METODOLOGI: 'Komponen F dari Indeks DMF-T WHO'
    },
    {
      NO: 11,
      NAMA_VARIABEL_SPSS: 'DMFT_TOTAL',
      LABEL_VARIABEL: 'Skor Total Indeks DMF-T (D + M + F)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale (Rasio)',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu penjumlahan (0 - 28)',
      KETERANGAN_METODOLOGI: 'Indikator utama keparahan karies gigi (WHO Oral Health Surveys)'
    },
    {
      NO: 12,
      NAMA_VARIABEL_SPSS: 'DMFT_KAT',
      LABEL_VARIABEL: 'Kategori Keparahan DMF-T Standar WHO',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Ordinal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Sangat Rendah (<1.2); 2 = Rendah (1.2-2.6); 3 = Sedang (2.7-4.4); 4 = Tinggi (4.5-6.5); 5 = Sangat Tinggi (>6.5)',
      KETERANGAN_METODOLOGI: 'Klasifikasi epidemiologi kesehatan gigi masyarakat WHO'
    },
    {
      NO: 13,
      NAMA_VARIABEL_SPSS: 'DEBRIS_IND',
      LABEL_VARIABEL: 'Debris Index Simplified (DI-S)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu desimal 0.0 - 3.0',
      KETERANGAN_METODOLOGI: 'Skor debris gigi indeks Greene & Vermillion'
    },
    {
      NO: 14,
      NAMA_VARIABEL_SPSS: 'CALCULUS_IND',
      LABEL_VARIABEL: 'Calculus Index Simplified (CI-S)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu desimal 0.0 - 3.0',
      KETERANGAN_METODOLOGI: 'Skor karang gigi (kalkulus) Greene & Vermillion'
    },
    {
      NO: 15,
      NAMA_VARIABEL_SPSS: 'OHIS_TOTAL',
      LABEL_VARIABEL: 'Skor Total Oral Hygiene Index Simplified (OHI-S)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu penjumlahan DI-S + CI-S (0.0 - 6.0)',
      KETERANGAN_METODOLOGI: 'Indeks kebersihan mulut standar emas Greene & Vermillion'
    },
    {
      NO: 16,
      NAMA_VARIABEL_SPSS: 'OHIS_KAT',
      LABEL_VARIABEL: 'Kategori Kebersihan Rongga Mulut (OHI-S)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Ordinal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Baik (0.0 - 1.2); 2 = Sedang (1.3 - 3.0); 3 = Buruk (3.1 - 6.0)',
      KETERANGAN_METODOLOGI: 'Tingkat kebersihan mulut untuk uji asosiasi Chi-Square'
    },
    {
      NO: 17,
      NAMA_VARIABEL_SPSS: 'PLAK_INDEKS',
      LABEL_VARIABEL: 'Skor Plak Indeks (Silness & Löe)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu desimal 0.0 - 3.0',
      KETERANGAN_METODOLOGI: 'Ketebalan plak servikal gigi Silness & Löe'
    },
    {
      NO: 18,
      NAMA_VARIABEL_SPSS: 'STATUS_PERIO',
      LABEL_VARIABEL: 'Status Keparahan Jaringan Periodontal Pasien',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Ordinal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Sehat; 2 = Gingivitis Marginalis; 3 = Gingivitis Kronis; 4 = Periodontitis Ringan; 5 = Periodontitis Kronis Sedang-Berat',
      KETERANGAN_METODOLOGI: 'Tingkat inflamasi jaringan periodontal AAP/EFP'
    },
    {
      NO: 19,
      NAMA_VARIABEL_SPSS: 'JML_GIGI_TERDAMPAK',
      LABEL_VARIABEL: 'Jumlah Elemen Gigi yang Memiliki Lesi/Kelainan',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai cacah bilangan bulat (0 - 32)',
      KETERANGAN_METODOLOGI: 'Beban penyakit klinis lokal'
    },
    {
      NO: 20,
      NAMA_VARIABEL_SPSS: 'GOL_DARAH',
      LABEL_VARIABEL: 'Golongan Darah Sistem ABO',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '1 = A; 2 = B; 3 = AB; 4 = O',
      KETERANGAN_METODOLOGI: 'Data serologis pasien'
    },
    {
      NO: 21,
      NAMA_VARIABEL_SPSS: 'KONDISI_SISTEMIK_KODE',
      LABEL_VARIABEL: 'Penyakit Sistemik Komorbiditas',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '0 = Tidak Ada; 1 = Diabetes Melitus; 2 = Hipertensi; 3 = Jantung Koroner; 4 = Kehamilan; 5 = Asma; 6 = Lainnya',
      KETERANGAN_METODOLOGI: 'Faktor risiko sistemik dua arah karies & periodontitis'
    },
    {
      NO: 22,
      NAMA_VARIABEL_SPSS: 'ASURANSI_KODE',
      LABEL_VARIABEL: 'Skema Jaminan Pembiayaan Pasien',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '1 = BPJS Kesehatan; 2 = Mandiri Inhealth; 3 = Prudential; 4 = Umum/Mandiri',
      KETERANGAN_METODOLOGI: 'Sosio-ekonomi dan akses layanan kesehatan'
    },
    {
      NO: 23,
      NAMA_VARIABEL_SPSS: 'KOTA_KODE',
      LABEL_VARIABEL: 'Kota Domisili Pasien',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: '1 = Jakarta; 2 = Surabaya; 3 = Bandung; 4 = Medan; 5 = Semarang; 6 = Yogyakarta; 7 = Denpasar; 8 = Makassar',
      KETERANGAN_METODOLOGI: 'Distribusi spasial demografi'
    },
    {
      NO: 24,
      NAMA_VARIABEL_SPSS: 'KODE_ICD10',
      LABEL_VARIABEL: 'Kode Diagnosis ICD-10 WHO',
      TIPE_DATA: 'String',
      SKALA_PENGUKURAN: 'Nominal',
      PANDUAN_KODING_VALUE_LABELS: 'Kode alfanumerik ICD-10 (K02.1, K05.1, K04.0, dll)',
      KETERANGAN_METODOLOGI: 'International Classification of Diseases Kemenkes RI'
    },
    {
      NO: 25,
      NAMA_VARIABEL_SPSS: 'BIAYA_ESTIMASI',
      LABEL_VARIABEL: 'Estimasi Total Biaya Perawatan Klinis (IDR)',
      TIPE_DATA: 'Numeric',
      SKALA_PENGUKURAN: 'Scale',
      PANDUAN_KODING_VALUE_LABELS: 'Nilai kontinu mata uang Rupiah',
      KETERANGAN_METODOLOGI: 'Analisis farmakoekonomi / beban biaya perawatan dental'
    }
  ];
}

/**
 * Generate copy-pasteable SPSS Syntax commands
 */
export function generateSpssSyntaxString(): string {
  return `* =========================================================================.
* SINTAKS IBM SPSS STATISTICS - DATA 100 PASIEN KLINIK DENTACARE
* Digunakan untuk otomatisasi Variable Labels, Value Labels, dan Analisis Statistik
* =========================================================================.

* 1. PENGATURAN VARIABLE LABELS (LABEL VARIABEL).
VARIABLE LABELS
  ID_PASIEN 'Nomor Identifikasi Pasien'
  NO_RM 'Nomor Rekam Medis Elektronik'
  NIK 'Nomor Induk Kependudukan Pasien'
  NAMA_PASIEN 'Nama Lengkap Pasien'
  KELAMIN 'Jenis Kelamin Pasien'
  USIA 'Usia Pasien (Tahun)'
  KAT_USIA 'Kategori Kelompok Usia Pasien'
  D_DECAY 'Jumlah Gigi Karies Aktif (Decayed)'
  M_MISSING 'Jumlah Gigi Hilang/Dicabut (Missing)'
  F_FILLED 'Jumlah Gigi Ditambal Sehat (Filled)'
  DMFT_TOTAL 'Skor Total Indeks DMF-T WHO'
  DMFT_KAT 'Kategori Keparahan DMF-T WHO'
  DEBRIS_IND 'Debris Index Simplified (DI-S)'
  CALCULUS_IND 'Calculus Index Simplified (CI-S)'
  OHIS_TOTAL 'Skor Indeks Kebersihan Mulut OHI-S'
  OHIS_KAT 'Kategori Kebersihan Mulut OHI-S'
  PLAK_INDEKS 'Skor Plak Indeks Silness & Loe'
  STATUS_PERIO 'Status Diagnosis Periodontal Pasien'
  JML_GIGI_TERDAMPAK 'Jumlah Gigi Terdampak Kelainan'
  GOL_DARAH_KODE 'Golongan Darah Pasien'
  KONDISI_SISTEMIK_KODE 'Penyakit Sistemik Komorbid'
  ASURANSI_KODE 'Jenis Jaminan Asuransi Pasien'
  KOTA_KODE 'Kota Domisili Pasien'
  KODE_ICD10 'Kode Diagnosis ICD-10 WHO'
  BIAYA_ESTIMASI 'Estimasi Biaya Perawatan (Rupiah)'.
EXECUTE.

* 2. PENGATURAN VALUE LABELS (KODE KATEGORIK UNTUK ANALISIS STATISTIK).
VALUE LABELS
  KELAMIN
    1 'Laki-laki'
    2 'Perempuan'
  /KAT_USIA
    1 'Pediatrik (5-12 th)'
    2 'Remaja (13-18 th)'
    3 'Dewasa Muda (19-35 th)'
    4 'Dewasa (36-50 th)'
    5 'Lansia (51-76 th)'
  /DMFT_KAT
    1 'Sangat Rendah (< 1.2)'
    2 'Rendah (1.2 - 2.6)'
    3 'Sedang (2.7 - 4.4)'
    4 'Tinggi (4.5 - 6.5)'
    5 'Sangat Tinggi (> 6.5)'
  /OHIS_KAT
    1 'Baik (0.0 - 1.2)'
    2 'Sedang (1.3 - 3.0)'
    3 'Buruk (3.1 - 6.0)'
  /STATUS_PERIO
    1 'Sehat'
    2 'Gingivitis Marginalis'
    3 'Gingivitis Kronis'
    4 'Periodontitis Ringan'
    5 'Periodontitis Kronis Sedang-Berat'
  /GOL_DARAH_KODE
    1 'A'
    2 'B'
    3 'AB'
    4 'O'
  /KONDISI_SISTEMIK_KODE
    0 'Tidak Ada'
    1 'Diabetes Melitus'
    2 'Hipertensi'
    3 'Jantung Koroner'
    4 'Kehamilan'
    5 'Asma'
    6 'Lainnya'
  /ASURANSI_KODE
    1 'BPJS Kesehatan'
    2 'Mandiri Inhealth'
    3 'Prudential'
    4 'Umum/Mandiri'
  /KOTA_KODE
    1 'Jakarta'
    2 'Surabaya'
    3 'Bandung'
    4 'Medan'
    5 'Semarang'
    6 'Yogyakarta'
    7 'Denpasar'
    8 'Makassar'.
EXECUTE.

* 3. PENGATURAN SKALA PENGUKURAN (VARIABLE LEVEL).
VARIABLE LEVEL
  ID_PASIEN, NO_RM, NIK, NAMA_PASIEN, KODE_ICD10, GOL_DARAH_KODE, KONDISI_SISTEMIK_KODE, ASURANSI_KODE, KOTA_KODE (NOMINAL)
  /KELAMIN (NOMINAL)
  /KAT_USIA, DMFT_KAT, OHIS_KAT, STATUS_PERIO (ORDINAL)
  /USIA, D_DECAY, M_MISSING, F_FILLED, DMFT_TOTAL, DEBRIS_IND, CALCULUS_IND, OHIS_TOTAL, PLAK_INDEKS, JML_GIGI_TERDAMPAK, BIAYA_ESTIMASI (SCALE).
EXECUTE.

* 4. ANALISIS STATISTIK DESKRIPTIF (MEAN, STD. DEV, MIN, MAX).
DESCRIPTIVES VARIABLES=USIA D_DECAY M_MISSING F_FILLED DMFT_TOTAL DEBRIS_IND CALCULUS_IND OHIS_TOTAL PLAK_INDEKS BIAYA_ESTIMASI
  /STATISTICS=MEAN STDDEV MIN MAX SEMEAN.

* 5. TABEL FREKUENSI VARIABEL KATEGORIK.
FREQUENCIES VARIABLES=KELAMIN KAT_USIA DMFT_KAT OHIS_KAT STATUS_PERIO ASURANSI_KODE KOTA_KODE
  /ORDER=ANALYSIS.

* 6. UJI TABEL SILANG (CROSSTABS & CHI-SQUARE) ANTARA KELOMPOK USIA DENGAN KATEGORI DMFT & OHIS.
CROSSTABS
  /TABLES=KAT_USIA BY DMFT_KAT OHIS_KAT
  /FORMAT=AVALUE TABLES
  /STATISTICS=CHISQ CC
  /CELLS=COUNT ROW COLUMN TOTAL.

* 7. UJI KORELASI PEARSON (ANTARA USIA, DMFT, OHIS, DAN PLAK INDEKS).
CORRELATIONS
  /VARIABLES=USIA DMFT_TOTAL OHIS_TOTAL PLAK_INDEKS
  /PRINT=TWOTAIL NOSIG
  /MISSING=PAIRWISE.

* 8. UJI BEDA MEAN (INDEPENDENT SAMPLES T-TEST) BERDASARKAN JENIS KELAMIN.
T-TEST GROUPS=KELAMIN(1 2)
  /VARIABLES=DMFT_TOTAL OHIS_TOTAL PLAK_INDEKS.

* 9. UJI ONE-WAY ANOVA PERBEDAAN DMFT DAN OHIS BERDASARKAN KELOMPOK USIA.
ONEWAY DMFT_TOTAL OHIS_TOTAL BY KAT_USIA
  /STATISTICS DESCRIPTIVES HOMOGENEITY
  /POSTHOC=TUKEY ALPHA(0.05).
`;
}

/**
 * Main function to generate and trigger download of the Master Excel (.xlsx) file
 */
export function downloadSpssExcelWorkbook() {
  const analytics = compute100PatientsAnalytics();

  // 1. Sheet 1: DATA_SPSS (Formatted strictly for SPSS imports)
  const spssDataRows = dummy100Patients.map((p, idx) => getPatientSpssRow(p, idx));
  const wsSpssData = XLSX.utils.json_to_sheet(spssDataRows);

  // Set explicit column widths for easy reading
  wsSpssData['!cols'] = [
    { wch: 10 }, // ID_PASIEN
    { wch: 14 }, // NO_RM
    { wch: 18 }, // NIK
    { wch: 26 }, // NAMA_PASIEN
    { wch: 10 }, // KELAMIN
    { wch: 12 }, // KELAMIN_STR
    { wch: 8 },  // USIA
    { wch: 10 }, // KAT_USIA
    { wch: 22 }, // KAT_USIA_STR
    { wch: 10 }, // D_DECAY
    { wch: 10 }, // M_MISSING
    { wch: 10 }, // F_FILLED
    { wch: 12 }, // DMFT_TOTAL
    { wch: 10 }, // DMFT_KAT
    { wch: 22 }, // DMFT_KAT_STR
    { wch: 12 }, // DEBRIS_IND
    { wch: 14 }, // CALCULUS_IND
    { wch: 12 }, // OHIS_TOTAL
    { wch: 10 }, // OHIS_KAT
    { wch: 18 }, // OHIS_KAT_STR
    { wch: 12 }, // PLAK_INDEKS
    { wch: 12 }, // STATUS_PERIO
    { wch: 30 }, // STATUS_PERIO_STR
    { wch: 18 }, // JML_GIGI_TERDAMPAK
    { wch: 20 }, // DAFTAR_GIGI_FDI
    { wch: 12 }, // KODE_ICD10
    { wch: 38 }, // DIAGNOSIS_UTAMA
    { wch: 22 }, // KONDISI_SISTEMIK_KODE
    { wch: 24 }, // KONDISI_SISTEMIK
    { wch: 16 }, // GOL_DARAH_KODE
    { wch: 12 }, // GOL_DARAH
    { wch: 16 }, // ASURANSI_KODE
    { wch: 18 }, // ASURANSI
    { wch: 12 }, // KOTA_KODE
    { wch: 14 }, // KOTA
    { wch: 32 }, // ALAMAT
    { wch: 16 }, // NO_TELEPON
    { wch: 16 }, // BIAYA_ESTIMASI
    { wch: 45 }, // TINDAKAN_REKOMENDASI
    { wch: 35 }, // TINDAKAN_TERAKHIR
    { wch: 14 }, // TGL_REGISTRASI
    { wch: 14 }  // TGL_KUNJUNGAN_TERAKHIR
  ];

  // 2. Sheet 2: KAMUS_VARIABEL_SPSS (Codebook / Data Dictionary)
  const codebookRows = buildSpssCodebook();
  const wsCodebook = XLSX.utils.json_to_sheet(codebookRows);
  wsCodebook['!cols'] = [
    { wch: 6 },  // NO
    { wch: 25 }, // NAMA_VARIABEL_SPSS
    { wch: 45 }, // LABEL_VARIABEL
    { wch: 12 }, // TIPE_DATA
    { wch: 18 }, // SKALA_PENGUKURAN
    { wch: 60 }, // PANDUAN_KODING_VALUE_LABELS
    { wch: 45 }  // KETERANGAN_METODOLOGI
  ];

  // 3. Sheet 3: RINGKASAN_STATISTIK (Summary Statistics)
  const summaryRows = [
    { METRIK_STATISTIK: 'Jumlah Total Sampel (N)', NILAI_ATAU_KETERANGAN: analytics.totalPatients, KATEGORI_KLINIS: '100% Pasien Terdata Lengkap' },
    { METRIK_STATISTIK: 'Jenis Kelamin: Laki-laki', NILAI_ATAU_KETERANGAN: `${analytics.genderCount.L} (${(analytics.genderCount.L / analytics.totalPatients * 100).toFixed(1)}%)`, KATEGORI_KLINIS: 'Distribusi Gender' },
    { METRIK_STATISTIK: 'Jenis Kelamin: Perempuan', NILAI_ATAU_KETERANGAN: `${analytics.genderCount.P} (${(analytics.genderCount.P / analytics.totalPatients * 100).toFixed(1)}%)`, KATEGORI_KLINIS: 'Distribusi Gender' },
    { METRIK_STATISTIK: 'Rata-rata Usia Pasien', NILAI_ATAU_KETERANGAN: '30.82 Tahun (SD: 16.4)', KATEGORI_KLINIS: 'Rentang 5 - 76 Tahun' },
    { METRIK_STATISTIK: 'Rata-rata Indeks DMF-T', NILAI_ATAU_KETERANGAN: analytics.averages.dmft, KATEGORI_KLINIS: 'Kategori Tinggi WHO (4.5 - 6.5)' },
    { METRIK_STATISTIK: 'Rata-rata Gigi Berlubang (Decayed / D)', NILAI_ATAU_KETERANGAN: analytics.averages.decay, KATEGORI_KLINIS: 'Gigi Karies Aktif Membutuhkan Restorasi' },
    { METRIK_STATISTIK: 'Rata-rata Gigi Hilang (Missing / M)', NILAI_ATAU_KETERANGAN: analytics.averages.missing, KATEGORI_KLINIS: 'Kehilangan Gigi Karena Karies / Periodontitis' },
    { METRIK_STATISTIK: 'Rata-rata Gigi Ditambal (Filled / F)', NILAI_ATAU_KETERANGAN: analytics.averages.filled, KATEGORI_KLINIS: 'Restorasi Gigi yang Ada' },
    { METRIK_STATISTIK: 'Rata-rata Skor OHI-S Total', NILAI_ATAU_KETERANGAN: analytics.averages.ohis, KATEGORI_KLINIS: 'Kategori Sedang (1.3 - 3.0)' },
    { METRIK_STATISTIK: 'Rata-rata Skor Plak Indeks', NILAI_ATAU_KETERANGAN: analytics.averages.plaqueIndex, KATEGORI_KLINIS: 'Plak Sedang Silness-Löe' },
    { METRIK_STATISTIK: 'Prevalensi Pasien Karies Aktif', NILAI_ATAU_KETERANGAN: `${analytics.activeCariesRate}%`, KATEGORI_KLINIS: 'Tingkat Morbiditas Karies Tinggi' },
    { METRIK_STATISTIK: 'Prevalensi Penyakit Periodontal', NILAI_ATAU_KETERANGAN: `${analytics.periodontalDiseaseRate}%`, KATEGORI_KLINIS: 'Gingivitis & Periodontitis Gabungan' },
    { METRIK_STATISTIK: 'Prevalensi Impaksi Gigi M3', NILAI_ATAU_KETERANGAN: `${analytics.impactionRate}%`, KATEGORI_KLINIS: 'Dewasa Muda Terindikasi Odontektomi' }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 25 },
    { wch: 45 }
  ];

  // 4. Sheet 4: PROGRAM_TINDAK_LANJUT (Clinical Follow-Up Recommendations)
  const programRows = dummyFollowUpPrograms.map(p => ({
    KODE_PROGRAM: p.code,
    JUDUL_PROGRAM: p.title,
    KATEGORI_KLINIS: p.category,
    PRIORITAS_INTERVENSI: p.priority,
    POPULASI_SASARAN: p.targetPopulation,
    PREVALENSI_TERDAMPAK: `${p.empiricalEvidence.affectedCount} Pasien (${p.empiricalEvidence.percentage}%)`,
    INDIKATOR_BUKTI_EMPIRIS: p.empiricalEvidence.metricLabel,
    NILAI_BUKTI_EMPIRIS: p.empiricalEvidence.metricValue,
    TEMUAN_KLINIS_EPIDEMIOLOGI: p.empiricalEvidence.clinicalFinding,
    INTERVENSI_KLINIS_1: p.clinicalInterventions[0] || '',
    INTERVENSI_KLINIS_2: p.clinicalInterventions[1] || '',
    INTERVENSI_KLINIS_3: p.clinicalInterventions[2] || '',
    INTERVENSI_KLINIS_4: p.clinicalInterventions[3] || '',
    KPI_UTAMA_1: `${p.kpiTargets[0]?.indicator || ''} (Target: ${p.kpiTargets[0]?.targetValue || ''}, ${p.kpiTargets[0]?.timeline || ''})`,
    KPI_UTAMA_2: `${p.kpiTargets[1]?.indicator || ''} (Target: ${p.kpiTargets[1]?.targetValue || ''}, ${p.kpiTargets[1]?.timeline || ''})`,
    ESTIMASI_BIAYA_PER_PASIEN: p.budgetEstimatePerPatient,
    STATUS_PELAKSANAAN: p.status.toUpperCase()
  }));
  const wsPrograms = XLSX.utils.json_to_sheet(programRows);
  wsPrograms['!cols'] = [
    { wch: 22 },
    { wch: 40 },
    { wch: 20 },
    { wch: 15 },
    { wch: 35 },
    { wch: 25 },
    { wch: 30 },
    { wch: 25 },
    { wch: 50 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
    { wch: 40 },
    { wch: 45 },
    { wch: 45 },
    { wch: 22 },
    { wch: 18 }
  ];

  // 5. Sheet 5: SINTAKS_SPSS (SPSS Syntax Script)
  const syntaxString = generateSpssSyntaxString();
  const syntaxRows = syntaxString.split('\n').map((line, idx) => ({
    NO_BARIS: idx + 1,
    PERINTAH_SINTAKS_IBM_SPSS: line
  }));
  const wsSyntax = XLSX.utils.json_to_sheet(syntaxRows);
  wsSyntax['!cols'] = [
    { wch: 10 },
    { wch: 100 }
  ];

  // Create Workbook and Append All Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSpssData, 'DATA_SPSS');
  XLSX.utils.book_append_sheet(wb, wsCodebook, 'KAMUS_VARIABEL_SPSS');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'RINGKASAN_DESKRIPTIF');
  XLSX.utils.book_append_sheet(wb, wsPrograms, 'PROGRAM_TINDAK_LANJUT');
  XLSX.utils.book_append_sheet(wb, wsSyntax, 'SINTAKS_SPSS');

  // Generate binary XLSX buffer and trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Data_100_Pasien_SPSS_DentaCare_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
}

/**
 * Download raw SPSS syntax file (.sps) directly for researchers
 */
export function downloadSpssSyntaxFile() {
  const syntax = generateSpssSyntaxString();
  const blob = new Blob([syntax], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `Sintaks_Analisis_SPSS_100_Pasien_${dateStr}.sps`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
