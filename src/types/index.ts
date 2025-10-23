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
