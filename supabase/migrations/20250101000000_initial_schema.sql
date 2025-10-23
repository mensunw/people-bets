-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Users Profile Table
CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  currency_balance INTEGER DEFAULT 1000 NOT NULL CHECK (currency_balance >= 0),
  last_claim_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Groups Table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false NOT NULL,
  leader_id UUID REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Group Members Table
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Bets Table
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bet_type TEXT DEFAULT 'over_or_under' NOT NULL,
  target_number NUMERIC NOT NULL,
  creator_id UUID REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  betting_window_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed', 'resolved')),
  winning_side TEXT CHECK (winning_side IN ('over', 'under')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Bets Table
CREATE TABLE user_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID REFERENCES bets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('over', 'under')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(bet_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_users_profile_username ON users_profile(username);
CREATE INDEX idx_groups_leader_id ON groups(leader_id);
CREATE INDEX idx_groups_is_private ON groups(is_private);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_bets_creator_id ON bets(creator_id);
CREATE INDEX idx_bets_group_id ON bets(group_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_betting_window_end ON bets(betting_window_end);
CREATE INDEX idx_user_bets_bet_id ON user_bets(bet_id);
CREATE INDEX idx_user_bets_user_id ON user_bets(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;

-- Users Profile Policies
CREATE POLICY "Users can view all profiles"
  ON users_profile FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users_profile FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users_profile FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Groups Policies
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    NOT is_private
    OR id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Group leaders can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = leader_id);

-- Group Members Policies
CREATE POLICY "Users can view members of groups they belong to"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    OR group_id IN (
      SELECT id FROM groups WHERE NOT is_private
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Bets Policies
CREATE POLICY "Users can view bets in their groups"
  ON bets FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can create bets in their groups"
  ON bets FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT leader_id FROM groups WHERE id = group_id
    )
  );

CREATE POLICY "Bet creators can update their bets"
  ON bets FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Bet creators can delete their bets"
  ON bets FOR DELETE
  USING (auth.uid() = creator_id);

-- User Bets Policies
CREATE POLICY "Users can view their own bets"
  ON user_bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view bets on bets they can see"
  ON user_bets FOR SELECT
  USING (
    bet_id IN (
      SELECT id FROM bets WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can place bets"
  ON user_bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, username, currency_balance, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    1000,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Trigger to auto-close bets when betting window ends
CREATE OR REPLACE FUNCTION close_expired_bets()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.betting_window_end <= NOW() AND NEW.status = 'open' THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_bet_expiration
  BEFORE UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION close_expired_bets();

-- Trigger to deduct currency when placing a bet
CREATE OR REPLACE FUNCTION deduct_bet_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users_profile
  SET currency_balance = currency_balance - NEW.amount
  WHERE id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_bet_placed
  AFTER INSERT ON user_bets
  FOR EACH ROW
  EXECUTE FUNCTION deduct_bet_amount();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to claim daily currency
CREATE OR REPLACE FUNCTION claim_daily_currency()
RETURNS JSONB AS $$
DECLARE
  user_id UUID := auth.uid();
  last_claim TIMESTAMPTZ;
  claim_amount INTEGER := 500;
  can_claim BOOLEAN;
BEGIN
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT last_claim_date INTO last_claim
  FROM users_profile
  WHERE id = user_id;

  can_claim := last_claim IS NULL OR last_claim < CURRENT_DATE;

  IF NOT can_claim THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
  END IF;

  UPDATE users_profile
  SET
    currency_balance = currency_balance + claim_amount,
    last_claim_date = NOW()
  WHERE id = user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Currency claimed successfully',
    'amount', claim_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve bet and distribute winnings
CREATE OR REPLACE FUNCTION resolve_bet(
  p_bet_id UUID,
  p_winning_side TEXT
)
RETURNS JSONB AS $$
DECLARE
  bet_record RECORD;
  total_pot NUMERIC;
  winning_pot NUMERIC;
  payout_ratio NUMERIC;
  winner RECORD;
BEGIN
  -- Validate winning side
  IF p_winning_side NOT IN ('over', 'under') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid winning side');
  END IF;

  -- Get bet details and verify creator
  SELECT * INTO bet_record
  FROM bets
  WHERE id = p_bet_id AND creator_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bet not found or not authorized');
  END IF;

  -- Check if bet can be resolved
  IF bet_record.status = 'resolved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bet already resolved');
  END IF;

  IF bet_record.betting_window_end > NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Betting window not ended');
  END IF;

  -- Calculate total pot and winning pot
  SELECT COALESCE(SUM(amount), 0) INTO total_pot
  FROM user_bets
  WHERE bet_id = p_bet_id;

  SELECT COALESCE(SUM(amount), 0) INTO winning_pot
  FROM user_bets
  WHERE bet_id = p_bet_id AND side = p_winning_side;

  -- If no winners, return money to all bettors
  IF winning_pot = 0 THEN
    FOR winner IN
      SELECT user_id, amount
      FROM user_bets
      WHERE bet_id = p_bet_id
    LOOP
      UPDATE users_profile
      SET currency_balance = currency_balance + winner.amount
      WHERE id = winner.user_id;
    END LOOP;
  ELSE
    -- Calculate payout ratio
    payout_ratio := total_pot / winning_pot;

    -- Distribute winnings
    FOR winner IN
      SELECT user_id, amount
      FROM user_bets
      WHERE bet_id = p_bet_id AND side = p_winning_side
    LOOP
      UPDATE users_profile
      SET currency_balance = currency_balance + FLOOR(winner.amount * payout_ratio)
      WHERE id = winner.user_id;
    END LOOP;
  END IF;

  -- Update bet status
  UPDATE bets
  SET
    status = 'resolved',
    winning_side = p_winning_side,
    resolved_at = NOW()
  WHERE id = p_bet_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bet resolved successfully',
    'winning_side', p_winning_side,
    'total_pot', total_pot,
    'winning_pot', winning_pot
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bet statistics
CREATE OR REPLACE FUNCTION get_bet_stats(p_bet_id UUID)
RETURNS JSONB AS $$
DECLARE
  total_over NUMERIC;
  total_under NUMERIC;
  total_participants INTEGER;
  total_pot NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN side = 'over' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN side = 'under' THEN amount ELSE 0 END), 0),
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO total_over, total_under, total_participants, total_pot
  FROM user_bets
  WHERE bet_id = p_bet_id;

  RETURN jsonb_build_object(
    'total_over', total_over,
    'total_under', total_under,
    'total_participants', total_participants,
    'total_pot', total_pot,
    'over_percentage', CASE WHEN total_pot > 0 THEN ROUND((total_over / total_pot * 100)::numeric, 2) ELSE 0 END,
    'under_percentage', CASE WHEN total_pot > 0 THEN ROUND((total_under / total_pot * 100)::numeric, 2) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Create global group (to be run after first user signs up)
-- This will be handled in the application layer or manually after deployment
