/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TOOTH_NUMBERS = {
  UPPER_RIGHT: [18, 17, 16, 15, 14, 13, 12, 11],
  UPPER_LEFT: [21, 22, 23, 24, 25, 26, 27, 28],
  LOWER_RIGHT: [48, 47, 46, 45, 44, 43, 42, 41],
  LOWER_LEFT: [31, 32, 33, 34, 35, 36, 37, 38],
  DECIDUOUS_UPPER_RIGHT: [55, 54, 53, 52, 51],
  DECIDUOUS_UPPER_LEFT: [61, 62, 63, 64, 65],
  DECIDUOUS_LOWER_RIGHT: [85, 84, 83, 82, 81],
  DECIDUOUS_LOWER_LEFT: [71, 72, 73, 74, 75],
};

export const TOOTH_STATUS_LABELS = {
  healthy: 'Sehat (S)',
  caries: 'Karies (D)',
  filling: 'Tambalan (F)',
  missing: 'Hilang (M)',
  impaction: 'Impaksi (I)',
  prosthesis: 'Protesa (P)',
};

export const TOOTH_STATUS_COLORS = {
  healthy: 'bg-green-100 border-green-500 text-green-700',
  caries: 'bg-red-100 border-red-500 text-red-700',
  filling: 'bg-blue-100 border-blue-500 text-blue-700',
  missing: 'bg-gray-100 border-gray-500 text-gray-700',
  impaction: 'bg-yellow-100 border-yellow-500 text-yellow-700',
  prosthesis: 'bg-purple-100 border-purple-500 text-purple-700',
};

export const ROLES = {
  admin: 'Administrator',
  dentist: 'Dokter Gigi',
  dental_therapist: 'Terapis Gigi dan Mulut',
  admin_staff: 'Petugas Administrasi',
};
