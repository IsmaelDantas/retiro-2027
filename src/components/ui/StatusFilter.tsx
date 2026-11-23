import type { ParticipantStatus } from '../../types/database';
import { STATUS_OPTIONS } from '../../utils/status';

interface StatusFilterProps {
  value: ParticipantStatus | 'all';
  onChange: (value: ParticipantStatus | 'all') => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar"
      role="tablist"
      aria-label="Filtrar por situação da inscrição"
    >
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-3.5 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap
            transition-colors duration-150 cursor-pointer border
            ${
              value === option.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-text-secondary border-border hover:bg-surface-tertiary hover:text-text-primary'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
