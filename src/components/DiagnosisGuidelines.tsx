/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BookOpen, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface GuidelineItem {
  title: string;
  causes: string[];
  symptoms: string[];
}

const guidelines: GuidelineItem[] = [
  {
    title: "1. Tidak terpenuhinya kebutuhan akan perlindungan dari resiko kesehatan",
    causes: [
      "Partisipasi dalam olahraga/kegiatan/pekerjaan yang beresiko menimbulkan cedera/gangguan kesehatan",
      "Penggunaan produk kesehatan gigi dan mulut yang tidak tepat",
      "Kurangnya pendidikan atau pengetahuan",
      "Parestesia, anestesia",
      "Kebiasaan buruk",
      "Potensi terjadinya infeksi",
      "Potensi terjadinya cedera mulut",
      "Kekhawatiran pada pengalaman negatif tentang pengendalian infeksi, keamanan radiasi, keamanan fluoride dan sejenisnya",
      "Perilaku atau gaya hidup yang berisiko terhadap kesehatan"
    ],
    symptoms: [
      "Bukti adanya rujukan segera atau konsultasi dengan seorang dokter mengenai penyakit yang tidak terkontrol (misalnya, tanda-tanda masalah jantung, tanda-tanda diabetes yang tidak terkontrol, atau tanda-tanda vital yang tidak normal) pada riwayat kesehatannya",
      "Bukti adanya kebutuhan untuk premedikasi antibiotik",
      "Bukti bahwa klien berisiko terjadinya cedera pada mulut (misalnya, memainkan olahraga kontak atau atletik tanpa pelindung mulut atau memiliki gangguan penglihatan, tremor, atau terbatasnya ketangkasan)",
      "Bukti bahwa klien berisiko untuk penyakit gigi dan mulut atau penyakit sistemik",
      "Bukti bahwa klien berada dalam situasi yang mengancam hidupnya"
    ]
  },
  {
    title: "2. Tidak terpenuhinya kebutuhan akan bebas dari ketakutan dan atau stress",
    causes: [
      "Pengalaman negatif perawatan sebelumnya",
      "Takut akan hal yang tidak/belum diketahuinya",
      "Kekurangan biaya/sumber keuangan",
      "Takut akan mahalnya biaya perawatan"
    ],
    symptoms: [
      "Klien merasa ketakutan",
      "Kekhawatiran klien tentang kerahasiaan, biaya perawatan, penularan penyakit, keracunan fluoride, keracunan merkuri, paparan radiasi, atau pada asuhan kesehatan gigi dan mulut yang direncanakan"
    ]
  },
  {
    title: "3. Tidak terpenuhinya kebutuhan akan kesan wajah yang sehat",
    causes: [
      "Menggunakan atau membutuhkan prostesis gigi dan mulut",
      "Penyakit atau gangguan gigi dan mulut yang terlihat",
      "Bau mulut (halitosis)",
      "Maloklusi",
      "Pengguna atau orang yang membutuhkan peralatan ortodontik"
    ],
    symptoms: [
      "Klien melaporkan ketidakpuasan dengan penampilan giginya",
      "Klien melaporkan ketidakpuasan dengan penampilan gusi/jaringan periodontalnya",
      "Klien melaporkan ketidakpuasan dengan penampilan profil wajahnya",
      "Klien melaporkan ketidakpuasan dengan penampilan prostesis giginya",
      "Klien melaporkan ketidakpuasan dengan aroma napasnya"
    ]
  },
  {
    title: "4. Tidak terpenuhinya kondisi biologis dan fungsi gigi-geligi yang baik",
    causes: [
      "Infeksi Streptococcus mutans",
      "Nutrisi dan diet yang kurang",
      "Faktor-faktor risiko yang dapat berubah dan tidak dapat diubah",
      "Kurangnya pendidikan kesehatan gigi dan mulut",
      "Kurang pemeliharaan kesehatan gigi dan mulut",
      "Kurang melakukan perawatan/pemeriksaan gigi regular"
    ],
    symptoms: [
      "Gigi dengan tanda-tanda penyakit",
      "Gigi yang hilang",
      "Rusaknya restorasi",
      "Gigi dengan abrasi atau erosi",
      "Gigi dengan tanda-tanda trauma",
      "Peralatan prostetik yang tidak pas",
      "Kesulitan mengunyah"
    ]
  },
  {
    title: "5. Tidak terpenuhinya keutuhan kulit dan membran mukosa pada kepala dan leher",
    causes: [
      "Infeksi mikroba and respon inang",
      "Perilaku pemeliharaan kesehatan gigi dan mulut yang tidak memadai",
      "Nutrisi yang tidak memadai",
      "Faktor-faktor risiko yang dapat berubah dan tidak dapat diubah",
      "Penggunaan tembakau",
      "Penyakit sistemik yang tidak terkontrol (misal diabetes, infeksi Human Immunodeficiency Virus [HIV])",
      "Kurang melakukan pemeriksaan/perawatan gigi reguler"
    ],
    symptoms: [
      "Adanya lesi ekstraoral atau intraoral, nyeri jika ditekan, atau ada pembengkakan; peradangan gingiva",
      "Perdarahan saat probing; poket dalam atau kehilangan attachment 4 mm; masalah mucogingival",
      "Terdapat xerostomia",
      "Manifestasi oral dari defisiensi nutrisi"
    ]
  },
  {
    title: "6. Tidak terpenuhinya kebutuhan terbebas dari nyeri pada kepala dan leher",
    causes: [
      "Ketidaknyamanan sendi rahang/Temporomandibular Joint (TMJ)",
      "Prosedur bedah mulut, prosedur tindakan medis gigi, prosedur asuhan kesehatan gigi dan mulut",
      "Penyakit gigi yang tidak diobati",
      "Akses yang tidak memadai ke fasilitas perawatan atau kurang rutinnya perawatan gigi"
    ],
    symptoms: [
      "Rasa sakit atau sensitivitas ekstraoral atau intraoral sebelum perawatan kebersihan gigi",
      "Lunak pada palpasi ketika pemeriksaan ekstraoral atau intraoral",
      "Ketidaknyamanan selama perawatan kebersihan gigi"
    ]
  },
  {
    title: "7. Tidak terpenuhinya konseptualisasi dan pemecahan masalah",
    causes: [
      "Defisit pengetahuan",
      "Kurangnya pemaparan informasi"
    ],
    symptoms: [
      "Klien memiliki pertanyaan, kesalahpahaman, atau kurangnya pengetahuan tentang penyakit gigi dan mulut",
      "Klien tidak memahami alasan untuk memelihara kesehatan gigi dan mulutnya sendiri (misalnya, alasan yang berkaitan dengan adanya oral biofilm and respon inang atau pentingnya menghilangkan oral biofilm setiap hari)",
      "Klien tidak memahami hubungan antara beberapa penyakit sistemik dan penyakit gigi dan mulut",
      "Klien salah menafsirkan informasi"
    ]
  },
  {
    title: "8. Tidak terpenuhinya tanggung jawab untuk kesehatan mulut",
    causes: [
      "Ketidakpatuhan atau ketidaktaatan",
      "Menggunakan alat bantu atau produk perawatan gigi dan mulut yang tidak tepat",
      "Perlu pengawasan orang tua terhadap kebersihan gigi dan mulutnya",
      "Kurang mampu memelihara kesehatan gigi dan mulutnya sendiri",
      "Tidak dapat memelihara kesehatan gigi dan mulutnya sendiri",
      "Kurangnya keterampilan",
      "Gangguan fisik dan kemampuan kognitif",
      "Perilaku pemeliharaan kesehatan mulut yang tidak memadai",
      "Kekurangan sumber keuangan"
    ],
    symptoms: [
      "Kontrol plak yang tidak memadai",
      "Kurang pengawasan orang tua (wali) terhadap pemeliharaan kebersihan gigi dan mulut anak sehari-hari",
      "Kurangnya pemantauan status kesehatan diri",
      "Tidak melakukan pemeriksaan gigi dalam 2 tahun terakhir"
    ]
  }
];

export function DiagnosisGuidelines() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGuidelines = guidelines.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.causes.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.symptoms.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="bg-pop-blue p-4 rounded-[1.5rem] shadow-lg shadow-pop-blue/20">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-pop-text tracking-tight uppercase italic">Pedoman Diagnosa</h1>
            <p className="text-pop-blue font-bold uppercase tracking-widest text-xs mt-1">Standar asuhan kesehatan gigi dan mulut Kemenkes RI</p>
          </div>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            placeholder="Cari pedoman, penyebab, atau gejala..." 
            className="pl-12 py-7 bg-white border-2 border-gray-100 focus:border-pop-blue/50 rounded-2xl font-medium text-pop-text shadow-lg shadow-gray-200/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredGuidelines.length > 0 ? (
          filteredGuidelines.map((item, index) => (
            <div key={index} className="group bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden hover:border-pop-blue/30 transition-all duration-500 shadow-xl shadow-gray-200/50">
              <div className="bg-gray-50/50 px-10 py-8 border-b border-gray-100">
                <div className="flex items-start space-x-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-pop-blue/10 border border-pop-blue/20 flex items-center justify-center text-pop-blue font-black text-lg group-hover:bg-pop-blue group-hover:text-white transition-colors duration-300">
                    {index + 1}
                  </span>
                  <h2 className="text-xl font-black text-pop-text leading-tight pt-1 uppercase italic">{item.title}</h2>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                <div className="p-10 space-y-6 bg-amber-50/30">
                  <div className="flex items-center space-x-3 text-amber-600">
                    <div className="p-2 bg-amber-100 rounded-lg border border-amber-200">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Etiologi / Penyebab</h3>
                  </div>
                  <ul className="space-y-4">
                    {item.causes.map((cause, cIdx) => (
                      <li key={cIdx} className="flex items-start space-x-3 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                        <span className="text-gray-500 text-sm font-medium leading-relaxed">{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-10 space-y-6 bg-emerald-50/30">
                  <div className="flex items-center space-x-3 text-emerald-600">
                    <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Tanda & Gejala Klinis</h3>
                  </div>
                  <ul className="space-y-4">
                    {item.symptoms.map((symptom, sIdx) => (
                      <li key={sIdx} className="flex items-start space-x-3 group/item">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                        <span className="text-gray-500 text-sm font-medium leading-relaxed">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white py-32 text-center rounded-[3rem] border-2 border-dashed border-gray-200 shadow-xl shadow-gray-200/50">
            <div className="bg-gray-50 h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-gray-100">
              <Search className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-2xl font-black text-pop-text uppercase italic">Tidak ada hasil</h3>
            <p className="text-gray-400 font-medium mt-2 max-w-xs mx-auto uppercase tracking-widest text-[10px]">Coba gunakan kata kunci lain untuk mencari pedoman diagnosa.</p>
            <Button 
              variant="ghost" 
              onClick={() => setSearchTerm('')} 
              className="mt-8 text-pop-blue font-black uppercase tracking-widest hover:bg-pop-blue/5 px-8 py-6 rounded-2xl border-2 border-pop-blue/10"
            >
              Hapus Pencarian
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
