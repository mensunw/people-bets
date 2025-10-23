export interface UserProfile {
  id: string;
  username: string;
  currency_balance: number;
  last_claim_date: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  leader_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface GroupWithMemberCount extends Group {
  member_count: number;
  is_member: boolean;
  is_leader: boolean;
}

export interface Bet {
  id: string;
  title: string;
  description: string;
  bet_type: string;
  target_number: number;
  creator_id: string;
  group_id: string;
  betting_window_end: string;
  status: 'open' | 'closed' | 'resolved';
  winning_side: 'over' | 'under' | null;
  resolved_at: string | null;
  created_at: string;
}

export interface UserBet {
  id: string;
  bet_id: string;
  user_id: string;
  side: 'over' | 'under';
  amount: number;
  created_at: string;
}
