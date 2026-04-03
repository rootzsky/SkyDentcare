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
    setSelectedTooth(selectedTooth === toothNumber ? null : toothNumber);
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
          const toothNum = num.toString();
          const status = data[toothNum] || 'healthy';
          const symbol = status === 'healthy' ? 'S' : 
                         status === 'caries' ? 'D' : 
                         status === 'filling' ? 'F' : 
                         status === 'missing' ? 'M' : 
                         status === 'impaction' ? 'I' : 
                         status === 'prosthesis' ? 'P' : '';
          const isSelected = selectedTooth === toothNum;

          return (
            <div key={num} className="relative">
              <button
                type="button"
                onClick={() => handleToothClick(toothNum)}
                className={cn(
                  'w-8 h-10 border-2 rounded-lg flex flex-col items-center justify-center transition-all shadow-sm relative',
                  status === 'healthy' ? 'bg-white border-gray-100 text-gray-300' : TOOTH_STATUS_COLORS[status],
                  isSelected && 'ring-2 ring-pop-blue ring-offset-2 ring-offset-white border-pop-blue/50 z-20',
                  !readOnly && 'hover:scale-110 hover:shadow-md cursor-pointer'
                )}
              >
                <span className="text-[10px] font-black">{num}</span>
                <div className="w-4 h-4 rounded-full border border-current mt-1 flex items-center justify-center">
                  <span className="text-[8px] font-black">{symbol}</span>
                </div>
              </button>

              {isSelected && !readOnly && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(TOOTH_STATUS_LABELS).map(([s, l]) => {
                      const sym = s === 'healthy' ? 'S' : 
                                  s === 'caries' ? 'D' : 
                                  s === 'filling' ? 'F' : 
                                  s === 'missing' ? 'M' : 
                                  s === 'impaction' ? 'I' : 
                                  s === 'prosthesis' ? 'P' : '';
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(s as ToothStatus)}
                          className={cn(
                            "flex items-center space-x-3 px-3 py-2 rounded-xl transition-all text-left group",
                            status === s ? "bg-pop-blue/10 text-pop-blue" : "hover:bg-gray-50 text-gray-600"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black shrink-0",
                            status === s ? "border-pop-blue bg-pop-blue text-white" : "border-gray-200 group-hover:border-pop-blue/30"
                          )}>
                            {sym}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "space-y-8 p-8 bg-white rounded-[2rem] border-2 border-gray-100 shadow-xl shadow-gray-200/50 overflow-x-auto relative transition-all duration-300",
      selectedTooth && "pb-64"
    )}>
      <div className="flex flex-col items-center space-y-12 min-w-[800px]">
        {/* Upper Permanent Teeth */}
        <div className="flex space-x-8">
          {renderToothRow(TOOTH_NUMBERS.UPPER_RIGHT, 'Kanan Atas (T)')}
          <div className="w-px h-16 bg-gray-100 self-end" />
          {renderToothRow(TOOTH_NUMBERS.UPPER_LEFT, 'Kiri Atas (T)')}
        </div>

        {/* Deciduous Teeth */}
        <div className="flex flex-col items-center space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border-2 border-gray-100">
          <span className="text-[10px] font-black text-pop-blue uppercase tracking-[0.3em] italic">Gigi Susu (Deciduous)</span>
          <div className="flex space-x-12">
            <div className="flex space-x-8">
              {renderToothRow(TOOTH_NUMBERS.DECIDUOUS_UPPER_RIGHT, 'RA Kanan')}
              <div className="w-px h-12 bg-gray-200 self-end" />
              {renderToothRow(TOOTH_NUMBERS.DECIDUOUS_UPPER_LEFT, 'RA Kiri')}
            </div>
          </div>
          <div className="w-full h-px bg-gray-200 my-2" />
          <div className="flex space-x-12">
            <div className="flex space-x-8">
              {renderToothRow(TOOTH_NUMBERS.DECIDUOUS_LOWER_RIGHT, 'RB Kanan')}
              <div className="w-px h-12 bg-gray-200 self-start" />
              {renderToothRow(TOOTH_NUMBERS.DECIDUOUS_LOWER_LEFT, 'RB Kiri')}
            </div>
          </div>
        </div>

        {/* Lower Permanent Teeth */}
        <div className="flex space-x-8">
          {renderToothRow(TOOTH_NUMBERS.LOWER_RIGHT, 'Kanan Bawah (T)')}
          <div className="w-px h-16 bg-gray-100 self-start" />
          {renderToothRow(TOOTH_NUMBERS.LOWER_LEFT, 'Kiri Bawah (T)')}
        </div>
      </div>

      {/* Status Legend */}
      <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4">
        {Object.entries(TOOTH_STATUS_LABELS).map(([status, label]) => {
          const symbol = status === 'healthy' ? 'S' : 
                         status === 'caries' ? 'D' : 
                         status === 'filling' ? 'F' : 
                         status === 'missing' ? 'M' : 
                         status === 'impaction' ? 'I' : 
                         status === 'prosthesis' ? 'P' : '';
          return (
            <div
              key={status}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-full border-2 shadow-sm opacity-60',
                status === 'healthy' ? 'bg-white border-gray-100 text-gray-400' : TOOTH_STATUS_COLORS[status as ToothStatus]
              )}
            >
              <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
                <span className="text-[8px] font-black">{symbol}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="mt-4 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">
            Klik pada gigi untuk mengubah status
          </p>
        </div>
      )}
    </div>
  );
}
