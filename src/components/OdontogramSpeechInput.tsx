/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  RotateCcw, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  Wand2, 
  Languages, 
  Square, 
  Trash2,
  ListOrdered
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ToothStatus } from '@/src/types';
import { TOOTH_STATUS_LABELS, TOOTH_STATUS_COLORS } from '@/src/constants';
import { 
  parseDentalVoiceCommand, 
  parseDentalSpeechWithAI, 
  ParsedToothCommand 
} from '@/src/lib/dentalSpeechParser';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

// Declare Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface OdontogramSpeechInputProps {
  onToothChange: (toothNumber: string, status: ToothStatus) => void;
  onBatchToothChange?: (updates: Record<string, ToothStatus>) => void;
  currentOdontogramData: Record<string, ToothStatus>;
  readOnly?: boolean;
}

export function OdontogramSpeechInput({
  onToothChange,
  onBatchToothChange,
  currentOdontogramData,
  readOnly = false,
}: OdontogramSpeechInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState<'id-ID' | 'en-US'>('id-ID');
  const [continuous, setContinuous] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [recentCommands, setRecentCommands] = useState<Array<{
    timestamp: Date;
    command: ParsedToothCommand;
    previousStatus: ToothStatus;
  }>>([]);
  const [lastBatch, setLastBatch] = useState<Record<string, ToothStatus> | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup error
        }
      }
    };
  }, []);

  // Play short acoustic feedback on command match
  const playFeedbackTone = (type: 'success' | 'start' | 'stop') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      // Audio context might be restricted before interaction, ignore
    }
  };

  // Apply parsed commands to odontogram
  const applyCommands = (commands: ParsedToothCommand[]) => {
    if (commands.length === 0) return 0;

    const previousStates: Record<string, ToothStatus> = {};
    const updates: Record<string, ToothStatus> = {};

    commands.forEach(cmd => {
      previousStates[cmd.toothNumber] = currentOdontogramData[cmd.toothNumber] || 'healthy';
      updates[cmd.toothNumber] = cmd.status;
    });

    setLastBatch(previousStates);

    // Apply updates
    if (onBatchToothChange) {
      onBatchToothChange(updates);
    } else {
      commands.forEach(cmd => {
        onToothChange(cmd.toothNumber, cmd.status);
      });
    }

    // Add to recent command history
    const historyEntries = commands.map(cmd => ({
      timestamp: new Date(),
      command: cmd,
      previousStatus: previousStates[cmd.toothNumber],
    }));
    setRecentCommands(prev => [...historyEntries, ...prev].slice(0, 10));

    playFeedbackTone('success');

    // Notify user
    if (commands.length === 1) {
      const c = commands[0];
      toast.success(`Gigi ${c.toothNumber} ➔ ${c.statusLabel}`, {
        description: `Diterima dari suara: "${c.rawText}"`,
      });
    } else {
      const summary = commands.map(c => `Gigi ${c.toothNumber} (${c.statusLabel})`).join(', ');
      toast.success(`${commands.length} gigi berhasil diperbarui!`, {
        description: summary,
      });
    }

    return commands.length;
  };

  // Process text with internal rule-based parser
  const handleProcessText = (textToParse?: string) => {
    const raw = textToParse || transcript;
    if (!raw.trim()) {
      toast.error('Belum ada teks atau suara yang terdeteksi');
      return;
    }

    const result = parseDentalVoiceCommand(raw);
    if (result.commands.length > 0) {
      applyCommands(result.commands);
    } else {
      toast.warning('Tidak terdeteksi nomor gigi atau kondisi yang cocok', {
        description: 'Coba ucapkan: "Gigi 16 karies" atau "Gigi 36 hilang"',
      });
    }
  };

  // Process with Gemini AI for complex dental dictations
  const handleAiProcess = async () => {
    const raw = transcript.trim();
    if (!raw) {
      toast.error('Masukkan atau diktekan kalimat terlebih dahulu');
      return;
    }

    setIsAiProcessing(true);
    try {
      const aiCommands = await parseDentalSpeechWithAI(raw);
      if (aiCommands.length > 0) {
        applyCommands(aiCommands);
        toast.success(`AI berhasil mengekstrak ${aiCommands.length} status gigi!`);
      } else {
        toast.info('AI tidak menemukan spesifikasi nomor gigi dan status yang valid.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memproses dengan AI: ' + (err.message || 'Error'));
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Start speech recognition
  const startListening = () => {
    if (readOnly) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Browser ini tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau ketik teks.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        shouldKeepListeningRef.current = continuous;
        playFeedbackTone('start');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += trans + ' ';
          } else {
            currentInterim += trans;
          }
        }

        setInterimTranscript(currentInterim);

        if (finalSegment.trim()) {
          setTranscript(prev => {
            const updated = (prev ? prev + ' ' : '') + finalSegment.trim();
            return updated;
          });

          // Automatically evaluate the finalized segment
          const parsed = parseDentalVoiceCommand(finalSegment);
          if (parsed.commands.length > 0) {
            applyCommands(parsed.commands);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Akses mikrofon ditolak browser. Mohon izinkan izin mikrofon.');
          stopListening();
        } else if (event.error === 'no-speech') {
          // Keep waiting if in continuous mode
        }
      };

      recognition.onend = () => {
        if (shouldKeepListeningRef.current) {
          // Restart if continuous mode is still intended
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimTranscript('');
          playFeedbackTone('stop');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      toast.error('Gagal mengaktifkan mikrofon: ' + (err.message || 'Error'));
      setIsListening(false);
    }
  };

  // Stop speech recognition
  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  // Undo last batch of commands
  const handleUndoLast = () => {
    if (!lastBatch || Object.keys(lastBatch).length === 0) {
      toast.info('Tidak ada riwayat suara untuk dibatalkan');
      return;
    }

    if (onBatchToothChange) {
      onBatchToothChange(lastBatch);
    } else {
      Object.entries(lastBatch).forEach(([tooth, status]) => {
        onToothChange(tooth, status);
      });
    }

    toast.success('Perubahan suara terakhir telah dibatalkan!');
    setLastBatch(null);
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-[2.5rem] border-2 border-pop-blue/20 shadow-xl shadow-pop-blue/5 p-6 md:p-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "p-3 rounded-2xl border-2 transition-all duration-300",
            isListening 
              ? "bg-rose-500 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-500/30 ring-4 ring-rose-100" 
              : "bg-pop-blue/10 border-pop-blue/30 text-pop-blue"
          )}>
            {isListening ? <Volume2 className="h-6 w-6 animate-bounce" /> : <Mic className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-pop-text uppercase italic tracking-tight">
                Mode Dikte Suara (Speech-to-Text)
              </h3>
              <Badge className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                isListening 
                  ? "bg-rose-500/10 text-rose-600 border-rose-300" 
                  : "bg-gray-100 text-gray-500 border-gray-200"
              )}>
                {isListening ? '● Live Recording' : 'Standby'}
              </Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Ucapkan nomor gigi dan kondisinya (contoh: "Gigi 16 karies", "Gigi 36 hilang")
            </p>
          </div>
        </div>

        {/* Quick config toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = language === 'id-ID' ? 'en-US' : 'id-ID';
              setLanguage(next);
              if (isListening) {
                stopListening();
                setTimeout(() => startListening(), 200);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[10px] font-black text-gray-600 hover:border-pop-blue hover:text-pop-blue transition-colors shadow-sm"
            title="Ganti Bahasa Dikte"
          >
            <Languages className="h-3.5 w-3.5 text-pop-blue" />
            <span>{language === 'id-ID' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
          </button>

          {/* Continuous Mode Toggle */}
          <button
            type="button"
            onClick={() => setContinuous(!continuous)}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black transition-colors shadow-sm",
              continuous 
                ? "bg-pop-blue/10 border-pop-blue/40 text-pop-blue" 
                : "bg-white border-gray-200 text-gray-400 hover:text-gray-600"
            )}
            title="Mikrofon tetap aktif selama pemeriksaan"
          >
            <span>Berkelanjutan: {continuous ? 'ON' : 'OFF'}</span>
          </button>

          {/* Guide Help Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={cn(
              "p-2 rounded-xl border transition-colors shadow-sm",
              showGuide ? "bg-pop-pink/10 border-pop-pink/40 text-pop-pink" : "bg-white border-gray-200 text-gray-400 hover:text-pop-blue"
            )}
            title="Panduan Kata Kunci Dikte"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Unsupported browser warning */}
      {!isSupported && (
        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 text-amber-800 flex items-start space-x-3 text-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase tracking-wider">Web Speech API Tidak Didukung Langsung</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Browser ini belum mengaktifkan speech recognition bawaan. Anda tetap dapat mengetikkan atau menggunakan dikte keyboard pada kolom input di bawah, lalu klik <strong>"Proses Perintah"</strong> atau <strong>"Analisis AI"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Expandable Voice Command Guide */}
      {showGuide && (
        <div className="p-5 bg-pop-blue/5 rounded-2xl border-2 border-pop-blue/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-pop-blue tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pop-blue" />
              Contoh Perintah Suara yang Didukung
            </h4>
            <span className="text-[9px] font-bold text-gray-400 uppercase">Sistem Notasi FDI</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[10px]">
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">🔴 Karies / Decay (D)</span>
              <p className="text-gray-500 italic">"Gigi 16 karies", "16 berlubang", "gigi satu enam karies"</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">🔵 Tambalan / Filling (F)</span>
              <p className="text-gray-500 italic">"Gigi 11 tambalan", "11 tumpatan komposit", "gigi 21 tambal"</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">⚫ Hilang / Missing (M)</span>
              <p className="text-gray-500 italic">"Gigi 36 hilang", "36 sudah dicabut", "gigi 46 ompong"</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">🟡 Impaksi / Impaction (I)</span>
              <p className="text-gray-500 italic">"Gigi 48 impaksi", "gigi 38 tertanam miring"</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">🟣 Protesa / Tiruan (P)</span>
              <p className="text-gray-500 italic">"Gigi 26 protesa", "gigi tiruan 24", "crown 11"</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1">
              <span className="font-black text-pop-text uppercase">⚡ Multi-Gigi Sekaligus</span>
              <p className="text-gray-500 italic">"Gigi 16 karies, gigi 11 tambalan, gigi 36 hilang"</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Microphone Interaction Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Primary Mic Toggle Button */}
        <Button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={readOnly}
          className={cn(
            "h-16 px-8 rounded-2xl flex items-center justify-center space-x-3 font-black uppercase italic tracking-wider transition-all duration-300 shadow-lg shrink-0",
            isListening
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 scale-[1.02] ring-4 ring-rose-200"
              : "bg-pop-pink hover:bg-pop-purple text-white shadow-pop-pink/20 hover:scale-105"
          )}
        >
          {isListening ? (
            <>
              <Square className="h-5 w-5 fill-current" />
              <span>Hentikan Dikte</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Mulai Dikte Suara</span>
            </>
          )}
        </Button>

        {/* Real-time Voice Transcript Input Field */}
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleProcessText();
              }
            }}
            placeholder={
              isListening
                ? (interimTranscript ? `Mendengarkan: "${interimTranscript}"` : "Mendengarkan suara Anda... Ucapkan 'Gigi 16 karies'")
                : "Teks suara akan muncul di sini (atau ketik langsung)..."
            }
            className={cn(
              "w-full h-16 pl-5 pr-28 rounded-2xl border-2 bg-white text-sm font-bold text-pop-text placeholder:text-gray-400 focus:outline-none transition-all",
              isListening 
                ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/20" 
                : "border-gray-200 focus:border-pop-blue focus:ring-2 focus:ring-pop-blue/10"
            )}
          />

          {/* Action buttons inside input */}
          <div className="absolute right-2 flex items-center space-x-1">
            {transcript && (
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  setInterimTranscript('');
                }}
                className="p-2 text-gray-300 hover:text-gray-500 rounded-xl transition-colors"
                title="Hapus Teks"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => handleProcessText()}
              disabled={!transcript.trim()}
              className="h-11 px-4 rounded-xl bg-pop-blue hover:bg-pop-blue/90 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-pop-blue/20"
            >
              Proses
            </Button>
          </div>
        </div>

        {/* AI Parse Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAiProcess}
          disabled={!transcript.trim() || isAiProcessing}
          className="h-16 px-6 rounded-2xl border-2 border-pop-blue/30 text-pop-blue hover:bg-pop-blue/10 font-black uppercase text-xs tracking-wider flex items-center justify-center space-x-2 shrink-0 transition-all"
          title="Ekstrak odontogram dari kalimat natural/panjang menggunakan Google Gemini"
        >
          <Wand2 className={cn("h-4 w-4 text-pop-blue", isAiProcessing && "animate-spin")} />
          <span>{isAiProcessing ? 'Menganalisis...' : 'AI Ekstrak'}</span>
        </Button>
      </div>

      {/* Interim feedback wave & live recognition text */}
      {isListening && (
        <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-200/80 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-pulse"></span>
              <span className="w-1.5 h-7 bg-rose-600 rounded-full animate-pulse delay-75"></span>
              <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-pulse delay-150"></span>
              <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-pulse delay-200"></span>
            </div>
            <p className="text-xs font-bold text-rose-900 italic">
              {interimTranscript ? `"${interimTranscript}"` : 'Mikrofon aktif... Silakan bicara'}
            </p>
          </div>
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Deteksi Otomatis Aktif
          </span>
        </div>
      )}

      {/* Recent Recognized Voice Actions & Undo Bar */}
      {recentCommands.length > 0 && (
        <div className="pt-2 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-hide">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <ListOrdered className="h-3 w-3" />
              Terdeteksi Baru Saja:
            </span>
            {recentCommands.slice(0, 4).map((entry, idx) => (
              <Badge
                key={idx}
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 shrink-0 shadow-sm",
                  TOOTH_STATUS_COLORS[entry.command.status]
                )}
              >
                <span>Gigi {entry.command.toothNumber}</span>
                <span className="opacity-75">➔</span>
                <span>{entry.command.statusLabel}</span>
              </Badge>
            ))}
          </div>

          {lastBatch && (
            <button
              type="button"
              onClick={handleUndoLast}
              className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider shrink-0 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Batalkan Perubahan Terakhir</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
