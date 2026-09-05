export type TradeSide = "LONG" | "SHORT";
export type TradeStatus = "OPEN" | "CLOSED";
export type NewsImpact = "HIGH" | "MEDIUM" | "LOW";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  trade_date: string;
  status: TradeStatus;
  notes: string | null;
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
