import type { PaymentStatus } from '../../types/database';
import { PAYMENT_STATUS_MAP } from '../../utils/payment';

interface PaymentBadgeProps {
  status: PaymentStatus;
}

export function PaymentBadge({ status }: PaymentBadgeProps) {
  const config = PAYMENT_STATUS_MAP[status];

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
