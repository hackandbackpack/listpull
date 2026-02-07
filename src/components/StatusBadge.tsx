import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type RequestStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={status} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
