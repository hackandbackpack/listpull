import { Badge } from '@/components/ui/badge';
import { GAME_LABELS, type GameType } from '@/lib/types';

interface GameBadgeProps {
  game: GameType;
  className?: string;
}

export function GameBadge({ game, className }: GameBadgeProps) {
  return (
    <Badge variant={game} className={className}>
      {GAME_LABELS[game]}
    </Badge>
  );
}
