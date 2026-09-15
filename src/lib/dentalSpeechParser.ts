/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToothStatus } from '@/src/types';
import { TOOTH_STATUS_LABELS } from '@/src/constants';
import { GoogleGenAI } from '@google/genai';

export interface ParsedToothCommand {
  toothNumber: string;
  status: ToothStatus;
  rawText: string;
  statusLabel: string;
}

export interface ParseResult {
  commands: ParsedToothCommand[];
  unrecognizedText: string[];
}

export async function parseDentalSpeechWithAI(naturalSpeech: string): Promise<ParsedToothCommand[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
Anda adalah asisten medis dokter gigi untuk pencatatan Odontogram (Sistem FDI).
Tugas Anda adalah membaca dikte suara pemeriksaan gigi berikut dan mengekstrak nomor gigi (11-48 untuk gigi permanen, 51-85 untuk gigi susu) beserta statusnya:

Kalimat Dikte: "${naturalSpeech}"

Pilihan status yang valid HANYA:
- "healthy" (Gigi sehat / normal / sound)
- "caries" (Karies / berlubang / decay / kavitas)
- "filling" (Tambalan / tumpatan / filling / komposit)
- "missing" (Hilang / dicabut / tanggal / missing)
- "impaction" (Impaksi / tertanam / impaction)
- "prosthesis" (Gigi tiruan / protesa / crown / bridge / prosthesis)

Kembalikan HANYA JSON array (tanpa penjelasan tambahan atau markdown):
[
  { "toothNumber": "16", "status": "caries", "rawText": "penjelasan singkat" }
]
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const rawList = JSON.parse(text);
    if (!Array.isArray(rawList)) return [];

    return rawList
      .filter((item: any) => VALID_TEETH.has(String(item.toothNumber)) && item.status in TOOTH_STATUS_LABELS)
      .map((item: any) => ({
        toothNumber: String(item.toothNumber),
        status: item.status as ToothStatus,
        rawText: item.rawText || naturalSpeech,
        statusLabel: TOOTH_STATUS_LABELS[item.status as ToothStatus] || item.status,
      }));
  } catch (error) {
    console.error('Error in parseDentalSpeechWithAI:', error);
    throw error;
  }
}

// Valid teeth FDI numbers
const VALID_TEETH = new Set([
  // Upper Right permanent
  '18', '17', '16', '15', '14', '13', '12', '11',
  // Upper Left permanent
  '21', '22', '23', '24', '25', '26', '27', '28',
  // Lower Left permanent
  '31', '32', '33', '34', '35', '36', '37', '38',
  // Lower Right permanent
  '41', '42', '43', '44', '45', '46', '47', '48',
  // Deciduous
  '55', '54', '53', '52', '51',
  '61', '62', '63', '64', '65',
  '71', '72', '73', '74', '75',
  '81', '82', '83', '84', '85',
]);

const STATUS_SYNONYMS: Record<ToothStatus, string[]> = {
  caries: [
    'karies', 'caries', 'lubang', 'berlubang', 'decay', 'kavitas', 'bolong', 'gigi karies', 'karies dentin', 'karies email'
  ],
  filling: [
    'tambalan', 'tambal', 'ditambal', 'tumpatan', 'komposit', 'amalgam', 'filling', 'restorasi', 'tumpat', 'gic'
  ],
  missing: [
    'hilang', 'dicabut', 'cabut', 'missing', 'ompong', 'ekstraksi', 'tanggal', 'loss', 'sudah dicabut'
  ],
  impaction: [
    'impaksi', 'impaction', 'tertanam', 'terpendam', 'miring'
  ],
  prosthesis: [
    'protesa', 'protesis', 'gigi tiruan', 'palsu', 'gigi palsu', 'prosthesis', 'crown', 'mahkota', 'bridge', 'jembatan', 'jaket'
  ],
  healthy: [
    'sehat', 'normal', 'sound', 'baik', 'bagus', 'bersih', 'utuh'
  ],
};

const NUMBER_WORDS: Record<string, string> = {
  'nol': '0', 'kosong': '0',
  'satu': '1', 'one': '1',
  'dua': '2', 'two': '2',
  'tiga': '3', 'three': '3',
  'empat': '4', 'four': '4',
  'lima': '5', 'five': '5',
  'enam': '6', 'six': '6',
  'tujuh': '7', 'seven': '7',
  'delapan': '8', 'eight': '8',
  'sembilan': '9', 'nine': '9',
  'sebelas': '11', 'eleven': '11',
  'dua belas': '12', 'twelve': '12',
  'tiga belas': '13', 'thirteen': '13',
  'empat belas': '14', 'fourteen': '14',
  'lima belas': '15', 'fifteen': '15',
  'enam belas': '16', 'sixteen': '16',
  'tujuh belas': '17', 'seventeen': '17',
  'delapan belas': '18', 'eighteen': '18',
  'sembilan belas': '19', 'nineteen': '19',
};

// Convert Indonesian compound numbers like "dua puluh satu" -> "21"
function normalizeSpokenNumbers(text: string): string {
  let normalized = text.toLowerCase();

  // Handle compound numbers like "dua puluh satu" -> 21
  const tens: Record<string, string> = {
    'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8'
  };
  const units: Record<string, string> = {
    'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9'
  };

  Object.entries(tens).forEach(([tenWord, tenDigit]) => {
    Object.entries(units).forEach(([unitWord, unitDigit]) => {
      const compound = `${tenWord} puluh ${unitWord}`;
      normalized = normalized.replace(new RegExp(`\\b${compound}\\b`, 'g'), `${tenDigit}${unitDigit}`);
    });
    normalized = normalized.replace(new RegExp(`\\b${tenWord} puluh\\b`, 'g'), `${tenDigit}0`);
  });

  // Handle teens FIRST before single digits (e.g. "enam belas" -> 16, "sebelas" -> 11)
  const teens: Record<string, string> = {
    'sebelas': '11', 'eleven': '11',
    'dua belas': '12', 'twelve': '12',
    'tiga belas': '13', 'thirteen': '13',
    'empat belas': '14', 'fourteen': '14',
    'lima belas': '15', 'fifteen': '15',
    'enam belas': '16', 'sixteen': '16',
    'tujuh belas': '17', 'seventeen': '17',
    'delapan belas': '18', 'eighteen': '18',
    'sembilan belas': '19', 'nineteen': '19',
  };
  Object.entries(teens).forEach(([word, num]) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  });

  // Handle single digits
  const singleDigits: Record<string, string> = {
    'nol': '0', 'kosong': '0', 'zero': '0',
    'satu': '1', 'one': '1',
    'dua': '2', 'two': '2',
    'tiga': '3', 'three': '3',
    'empat': '4', 'four': '4',
    'lima': '5', 'five': '5',
    'enam': '6', 'six': '6',
    'tujuh': '7', 'seven': '7',
    'delapan': '8', 'eight': '8',
    'sembilan': '9', 'nine': '9',
  };
  Object.entries(singleDigits).forEach(([word, num]) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  });

  // Handle spaced individual digits (e.g. "1 6" or "satu enam" -> "16")
  // Match single digit followed by single digit: e.g. "gigi 1 6" -> "gigi 16"
  normalized = normalized.replace(/\b([1-8])\s+([1-8])\b/g, '$1$2');

  return normalized;
}

export function parseDentalVoiceCommand(transcript: string): ParseResult {
  const commands: ParsedToothCommand[] = [];
  const unrecognizedText: string[] = [];

  if (!transcript || !transcript.trim()) {
    return { commands, unrecognizedText };
  }

  // Pre-process transcript
  const normalized = normalizeSpokenNumbers(transcript);

  // Split clauses by common sentence separators like comma, "dan", "lalu", "kemudian", semicolon, period
  const clauses = normalized
    .split(/[,;\.\n]|(?:\s+dan\s+)|\s+lalu\s+|\s+kemudian\s+|\s+serta\s+/i)
    .map(c => c.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    let foundTooth: string | null = null;
    let foundStatus: ToothStatus | null = null;

    // 1. Look for tooth number: either explicit "gigi 16" or bare 2-digit number "16"
    // Check 2-digit numbers
    const numberMatches = clause.match(/\b([1-8][1-8])\b/g);
    if (numberMatches) {
      for (const num of numberMatches) {
        if (VALID_TEETH.has(num)) {
          foundTooth = num;
          break;
        }
      }
    }

    // 2. Look for tooth status
    for (const [status, synonyms] of Object.entries(STATUS_SYNONYMS)) {
      for (const syn of synonyms) {
        const regex = new RegExp(`\\b${syn}\\b`, 'i');
        if (regex.test(clause)) {
          foundStatus = status as ToothStatus;
          break;
        }
      }
      if (foundStatus) break;
    }

    // Check single letter abbreviations (e.g., "16 d", "11 f", "36 m")
    if (foundTooth && !foundStatus) {
      if (/\b(d|karies|caries)\b/i.test(clause)) foundStatus = 'caries';
      else if (/\b(f|tambal|filling)\b/i.test(clause)) foundStatus = 'filling';
      else if (/\b(m|hilang|missing)\b/i.test(clause)) foundStatus = 'missing';
      else if (/\b(i|impaksi|impaction)\b/i.test(clause)) foundStatus = 'impaction';
      else if (/\b(p|protesa|prosthesis)\b/i.test(clause)) foundStatus = 'prosthesis';
      else if (/\b(s|sehat|sound)\b/i.test(clause)) foundStatus = 'healthy';
    }

    if (foundTooth && foundStatus) {
      commands.push({
        toothNumber: foundTooth,
        status: foundStatus,
        rawText: clause,
        statusLabel: TOOTH_STATUS_LABELS[foundStatus] || foundStatus,
      });
    } else if (clause.length > 3) {
      unrecognizedText.push(clause);
    }
  }

  // Deduplicate commands (if same tooth mentioned multiple times, last one wins)
  const uniqueMap = new Map<string, ParsedToothCommand>();
  for (const cmd of commands) {
    uniqueMap.set(cmd.toothNumber, cmd);
  }

  return {
    commands: Array.from(uniqueMap.values()),
    unrecognizedText,
  };
}
