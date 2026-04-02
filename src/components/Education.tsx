/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  BookOpen, 
  Play, 
  ChevronRight, 
  Search, 
  Star, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Info,
  Video
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { cn } from '@/src/lib/utils';
import Markdown from 'react-markdown';

interface EducationTopic {
  id: string;
  title: string;
  description: string;
  category: 'Dasar' | 'Pencegahan' | 'Tindakan' | 'Anak';
  duration: string;
  videoUrl: string;
  content: string;
  thumbnail: string;
}

const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: '1',
    title: 'Penyuluhan Kesehatan Gigi dan Mulut',
    description: 'Materi penyuluhan komprehensif tentang pentingnya menjaga kesehatan gigi masyarakat.',
    category: 'Dasar',
    duration: '6 Menit',
    videoUrl: 'https://www.youtube.com/embed/qU1kehTdcgQ',
    thumbnail: 'https://picsum.photos/seed/dental_qU1/400/300',
    content: `
# Penyuluhan Kesehatan Gigi dan Mulut

Kesehatan gigi dan mulut adalah jendela kesehatan tubuh Anda. Video ini membahas dasar-dasar perawatan gigi yang sering diabaikan.

### Poin Utama:
* **Penyikatan Gigi**: Teknik yang benar dan waktu yang tepat.
* **Diet Sehat**: Makanan yang memperkuat email gigi.
* **Pemeriksaan Rutin**: Mengapa 6 bulan sekali itu wajib.
    `
  },
  {
    id: '2',
    title: 'Edukasi Kesehatan Gigi & Mulut (Animasi)',
    description: 'Penjelasan menarik mengenai kuman dan cara kerja pasta gigi dalam melindungi mulut.',
    category: 'Anak',
    duration: '4 Menit',
    videoUrl: 'https://www.youtube.com/embed/Zo_AYaib4Mg',
    thumbnail: 'https://picsum.photos/seed/dental_ZoA/400/300',
    content: `
# Edukasi Kesehatan Gigi & Mulut

Video animasi ini sangat cocok untuk anak-anak maupun dewasa untuk memahami bagaimana bakteri bekerja di dalam mulut kita.

### Apa yang Dipelajari?
* **Proses Terjadinya Lubang**: Bagaimana gula berubah menjadi asam.
* **Peran Fluoride**: Bagaimana pasta gigi membantu memperbaiki email yang rusak.
* **Kebiasaan Baik**: Membangun rutinitas pagi dan malam.
    `
  },
  {
    id: '3',
    title: 'Cara Menyikat Gigi yang Benar',
    description: 'Tutorial langkah demi langkah menyikat gigi dengan teknik yang direkomendasikan dokter gigi.',
    category: 'Dasar',
    duration: '3 Menit',
    videoUrl: 'https://www.youtube.com/embed/k5Kz3xQzqF0',
    thumbnail: 'https://picsum.photos/seed/dental_k5K/400/300',
    content: `
# Teknik Menyikat Gigi yang Benar

Banyak orang menyikat gigi setiap hari, tapi tidak semuanya melakukannya dengan efektif. Pelajari teknik yang benar di sini.

### Langkah Praktis:
1. **Sudut 45 Derajat**: Arahkan bulu sikat ke arah gusi.
2. **Gerakan Lembut**: Jangan menyikat terlalu keras untuk menghindari abrasi gusi.
3. **Durasi 2 Menit**: Pastikan setiap bagian gigi terjangkau dengan rata.
    `
  },
  {
    id: '4',
    title: 'Pentingnya Menjaga Kesehatan Gigi',
    description: 'Dampak kesehatan gigi terhadap kesehatan sistemik dan kualitas hidup.',
    category: 'Pencegahan',
    duration: '5 Menit',
    videoUrl: 'https://www.youtube.com/embed/M8hjWipxJIs',
    thumbnail: 'https://picsum.photos/seed/dental_M8h/400/300',
    content: `
# Mengapa Gigi Itu Penting?

Gigi bukan hanya untuk mengunyah, tapi juga berperan dalam bicara dan penampilan.

### Dampak Kesehatan:
* **Kesehatan Jantung**: Hubungan antara penyakit gusi dan masalah jantung.
* **Pencernaan**: Gigi yang sehat membantu proses pencernaan awal.
* **Kualitas Hidup**: Bebas dari rasa sakit meningkatkan produktivitas harian.
    `
  }
];

export function Education() {
  const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  const categories = ['Semua', 'Dasar', 'Pencegahan', 'Tindakan', 'Anak'];

  const filteredTopics = EDUCATION_TOPICS.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Semua' || topic.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-pop-text tracking-tighter uppercase italic">Edukasi <span className="text-pop-blue">Kesehatan</span></h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Materi video pilihan untuk kesehatan gigi dan mulut Anda.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-pop-blue/5 border-2 border-pop-blue/20 rounded-2xl shadow-lg shadow-pop-blue/5">
            <BookOpen className="h-6 w-6 text-pop-blue" />
            <span className="text-[10px] font-black text-pop-blue uppercase tracking-[0.2em]">Pusat Pengetahuan</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar / List */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Cari materi..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-6 bg-gray-50 border-2 border-gray-100 focus:border-pop-blue rounded-2xl font-black text-pop-text uppercase tracking-widest text-[10px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                      activeCategory === cat 
                        ? "bg-pop-blue border-pop-blue text-white shadow-lg shadow-pop-blue/20" 
                        : "bg-white border-gray-100 text-gray-400 hover:border-pop-blue/30"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={cn(
                  "w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-300 group flex items-center space-x-4",
                  selectedTopic?.id === topic.id 
                    ? "bg-pop-blue/5 border-pop-blue shadow-xl shadow-pop-blue/10 scale-[1.02]" 
                    : "bg-white border-gray-100 hover:border-pop-blue/30 shadow-lg shadow-gray-200/30"
                )}
              >
                <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                  <img src={topic.thumbnail} alt={topic.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[7px] px-2 py-0.5 bg-white border-gray-100 text-gray-400">{topic.category}</Badge>
                    <div className="flex items-center text-[7px] font-black text-gray-300 uppercase tracking-widest">
                      <Clock className="h-3 w-3 mr-1" /> {topic.duration}
                    </div>
                  </div>
                  <h3 className="font-black text-pop-text uppercase italic tracking-tight text-sm truncate group-hover:text-pop-blue transition-colors">{topic.title}</h3>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1 line-clamp-1">{topic.description}</p>
                </div>
                <ChevronRight className={cn("h-5 w-5 transition-transform", selectedTopic?.id === topic.id ? "text-pop-blue translate-x-1" : "text-gray-200")} />
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8">
          {selectedTopic ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-gray-100 bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] overflow-hidden">
                <div className="aspect-video bg-black relative overflow-hidden group/video rounded-[2rem] shadow-2xl">
                  <iframe
                    src={selectedTopic.videoUrl}
                    title={selectedTopic.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <CardHeader className="p-10 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Badge className="bg-pop-blue/10 text-pop-blue border-pop-blue/20 px-4 py-1 rounded-full font-black text-[8px] uppercase tracking-widest">
                      {selectedTopic.category}
                    </Badge>
                    <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Clock className="h-4 w-4 mr-2" /> Durasi: {selectedTopic.duration}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-pop-green uppercase tracking-widest">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Terverifikasi Medis
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-black text-pop-text uppercase italic tracking-tight">{selectedTopic.title}</CardTitle>
                  <CardDescription className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest leading-relaxed">
                    {selectedTopic.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="prose prose-sm max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tight prose-p:font-bold prose-p:text-gray-600 prose-li:font-bold prose-li:text-gray-600">
                    <div className="markdown-body">
                      <Markdown>{selectedTopic.content}</Markdown>
                    </div>
                  </div>
                  <div className="mt-12 p-8 bg-pop-blue/5 rounded-[2.5rem] border-2 border-pop-blue/10 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg border-2 border-pop-blue/20">
                        <Star className="h-8 w-8 text-pop-blue fill-pop-blue" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-pop-text uppercase italic tracking-tight">Ingin tahu lebih banyak?</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Konsultasikan langsung dengan dokter gigi kami.</p>
                      </div>
                    </div>
                    <Button variant="outline" className="px-8 py-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-pop-blue/20 text-pop-blue hover:bg-pop-blue hover:text-white transition-all">
                      <ExternalLink className="h-4 w-4 mr-2" /> Sumber Asli
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-8 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[4rem]">
              <div className="h-32 w-32 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl border-2 border-gray-100 animate-pulse">
                <Video className="h-16 w-16 text-pop-blue" />
              </div>
              <div className="max-w-md">
                <h2 className="text-2xl font-black text-pop-text uppercase italic tracking-tight">Pilih Materi Edukasi</h2>
                <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest leading-relaxed">
                  Silakan pilih salah satu materi di sebelah kiri untuk mulai mempelajari cara menjaga kesehatan gigi dan mulut Anda.
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-100 shadow-sm">
                  <Info className="h-4 w-4 text-pop-blue" />
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Video HD</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-100 shadow-sm">
                  <Info className="h-4 w-4 text-pop-blue" />
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Materi Lengkap</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

