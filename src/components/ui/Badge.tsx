import type { ParticipantStatus } from '../../types/database';
import { STATUS_MAP } from '../../utils/status';

interface BadgeProps {
  status: ParticipantStatus;
}

export function Badge({ status }: BadgeProps) {
  const config = STATUS_MAP[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border shadow-2xs
        ${config.bgColor} ${config.color} ${config.borderColor}
      `}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dotColor}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
