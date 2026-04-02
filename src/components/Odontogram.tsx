/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { TOOTH_NUMBERS, TOOTH_STATUS_COLORS, TOOTH_STATUS_LABELS } from '@/src/constants';
import { ToothStatus } from '@/src/types';

interface OdontogramProps {
  data: Record<string, ToothStatus>;
  onChange?: (toothNumber: string, status: ToothStatus) => void;
  readOnly?: boolean;
}

export function Odontogram({ data, onChange, readOnly = false }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  const handleToothClick = (toothNumber: string) => {
    if (readOnly) return;
    setSelectedTooth(toothNumber);
  };

  const handleStatusChange = (status: ToothStatus) => {
    if (selectedTooth && onChange) {
      onChange(selectedTooth, status);
      setSelectedTooth(null);
    }
  };

  const renderToothRow = (numbers: number[], label: string) => (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">{label}</span>
      <div className="flex space-x-1">
        {numbers.map((num) => {
          const status = data[num.toString()] || 'healthy';
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleToothClick(num.toString())}
              className={cn(
                'w-8 h-10 border-2 rounded-lg flex flex-col items-center justify-center transition-all shadow-sm',
                status === 'healthy' ? 'bg-white border-gray-100 text-gray-300' : TOOTH_STATUS_COLORS[status],
                selectedTooth === num.toString() && 'ring-2 ring-pop-blue ring-offset-2 ring-offset-white border-pop-blue/50',
                !readOnly && 'hover:scale-110 hover:shadow-md cursor-pointer'
              )}
            >
              <span className="text-[10px] font-black">{num}</span>
              <div className="w-4 h-4 rounded-full border border-current mt-1 flex items-center justify-center">
                {status !== 'healthy' && (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-8 bg-white rounded-[2rem] border-2 border-gray-100 shadow-xl shadow-gray-200/50 overflow-x-auto">
      <div className="flex flex-col items-center space-y-8 min-w-[600px]">
        {/* Upper Teeth */}
        <div className="flex space-x-8">
          {renderToothRow(TOOTH_NUMBERS.UPPER_RIGHT, 'Kanan Atas')}
          <div className="w-px h-16 bg-gray-100 self-end" />
          {renderToothRow(TOOTH_NUMBERS.UPPER_LEFT, 'Kiri Atas')}
        </div>

        {/* Lower Teeth */}
        <div className="flex space-x-8">
          {renderToothRow(TOOTH_NUMBERS.LOWER_RIGHT, 'Kanan Bawah')}
          <div className="w-px h-16 bg-gray-100 self-start" />
          {renderToothRow(TOOTH_NUMBERS.LOWER_LEFT, 'Kiri Bawah')}
        </div>
      </div>

      {/* Status Legend & Selector */}
      <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4">
        {Object.entries(TOOTH_STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => handleStatusChange(status as ToothStatus)}
            disabled={!selectedTooth || readOnly}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-full border-2 transition-all shadow-sm',
              status === 'healthy' ? 'bg-white border-gray-100 text-gray-400' : TOOTH_STATUS_COLORS[status as ToothStatus],
              (!selectedTooth || readOnly) && 'opacity-30 cursor-not-allowed grayscale shadow-none'
            )}
          >
            <div className="w-3 h-3 rounded-full bg-current" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </div>

      {selectedTooth && !readOnly && (
        <div className="mt-4 text-center animate-bounce">
          <p className="text-xs font-black text-pop-blue uppercase tracking-widest italic">
            Pilih status untuk Gigi {selectedTooth}
          </p>
        </div>
      )}
    </div>
  );
}
