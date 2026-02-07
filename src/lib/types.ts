export type GameType = 'magic' | 'onepiece' | 'pokemon' | 'other';
export type RequestStatus = 'submitted' | 'in_progress' | 'ready' | 'picked_up' | 'cancelled';
export type NotifyMethod = 'email' | 'sms';
export type AppRole = 'admin' | 'staff';

export interface DeckRequest {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  email: string;
  phone: string | null;
  notify_method: NotifyMethod;
  game: GameType;
  format: string | null;
  pickup_window: string | null;
  notes: string | null;
  raw_decklist: string;
  status: RequestStatus;
  staff_notes: string | null;
  estimated_total: number | null;
  missing_items: string | null;
}

export interface ConditionVariant {
  condition: string;
  quantity: number;
  price: number;
}

export interface DeckLineItem {
  id: string;
  deck_request_id: string;
  quantity: number;
  card_name: string;
  parse_confidence: number | null;
  line_raw: string;
  created_at: string;
  quantity_found: number | null;
  unit_price: number | null;
  condition_variants: ConditionVariant[] | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const GAME_LABELS: Record<GameType, string> = {
  magic: 'Magic: The Gathering',
  onepiece: 'One Piece TCG',
  pokemon: 'Pokémon',
  other: 'Other',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
};

export const STATUS_ORDER: RequestStatus[] = ['submitted', 'in_progress', 'ready', 'picked_up'];
