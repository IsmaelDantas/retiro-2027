import type { ParticipantStatus } from '../../types/database';
import { STATUS_OPTIONS } from '../../utils/status';

interface StatusFilterProps {
  value: ParticipantStatus | 'all';
  onChange: (value: ParticipantStatus | 'all') => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar" role="tablist" aria-label="Filtrar por status">
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95 border
            ${
              value === option.value
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
