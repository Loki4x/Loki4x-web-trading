export type TradeSide = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED";
export type NewsImpact = "HIGH" | "MEDIUM" | "LOW";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_admin?: boolean;
  tier: "FREE" | "VIP";
  vip_expires_at: string | null;
  is_suspended: boolean;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  exit_price: number | null;
  pips: number | null;
  pnl: number | null;
  trade_date: string;
  status: TradeStatus;
  notes: string | null;
  confluence: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  created_at: string;
}

export interface NewsEvent {
  id: string;
  event_title: string;
  currency: string;
  impact_level: NewsImpact;
  release_time: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}
