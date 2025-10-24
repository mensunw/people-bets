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

-- Leaderboard Table
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  total_bets INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  total_wagered INTEGER DEFAULT 0,
  total_winnings INTEGER DEFAULT 0,
  net_profit INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
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
CREATE INDEX idx_leaderboard_net_profit ON leaderboard(net_profit DESC);
CREATE INDEX idx_leaderboard_win_rate ON leaderboard(win_rate DESC);
CREATE INDEX idx_leaderboard_total_wins ON leaderboard(total_wins DESC);
CREATE INDEX idx_leaderboard_current_streak ON leaderboard(current_streak DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Authenticated users can view all groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

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
-- Simple policy: users can view their own memberships and memberships of public groups
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups or be invited by leaders"
  ON group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

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

-- Leaderboard Policies
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

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

-- Trigger to automatically add group creator to group_members
CREATE OR REPLACE FUNCTION add_creator_to_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id)
  VALUES (NEW.id, NEW.leader_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_to_group();

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
-- GLOBAL GROUP SETUP
-- =====================================================

-- Function to auto-add users to global group on profile creation
CREATE OR REPLACE FUNCTION add_user_to_global_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Create global group if it doesn't exist (for first user)
  INSERT INTO groups (id, name, description, is_private, leader_id)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Global', 'Public group for all users', false, NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Add user to global group
  INSERT INTO group_members (group_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, NEW.id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add new users to global group
CREATE TRIGGER on_profile_created_add_to_global
  AFTER INSERT ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_global_group();

-- Function to update leaderboard for all users
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all users who have placed bets
  FOR user_record IN
    SELECT DISTINCT u.id, u.username
    FROM users_profile u
    WHERE EXISTS (SELECT 1 FROM user_bets WHERE user_id = u.id)
  LOOP
    -- Calculate stats for this user
    DECLARE
      total_bets_count INTEGER;
      wins_count INTEGER;
      losses_count INTEGER;
      total_wagered_amount INTEGER;
      total_winnings_amount INTEGER := 0;
      calculated_win_rate DECIMAL(5,2) := 0;
      current_streak_count INTEGER := 0;
      best_streak_count INTEGER := 0;
      resolved_bets_count INTEGER;
    BEGIN
      -- Get basic stats
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE b.status = 'resolved' AND b.winning_side = ub.side) as wins,
        COUNT(*) FILTER (WHERE b.status = 'resolved' AND b.winning_side != ub.side) as losses,
        COALESCE(SUM(ub.amount), 0) as wagered
      INTO total_bets_count, wins_count, losses_count, total_wagered_amount
      FROM user_bets ub
      JOIN bets b ON b.id = ub.bet_id
      WHERE ub.user_id = user_record.id;

      -- Calculate total winnings
      SELECT COALESCE(SUM(
        CASE
          WHEN b.winning_side = ub.side THEN
            FLOOR((ub.amount::NUMERIC / NULLIF(winning_totals.total, 0)) * pot_totals.total)
          ELSE 0
        END
      ), 0)
      INTO total_winnings_amount
      FROM user_bets ub
      JOIN bets b ON b.id = ub.bet_id
      LEFT JOIN (
        SELECT bet_id, SUM(amount) as total
        FROM user_bets
        GROUP BY bet_id
      ) pot_totals ON pot_totals.bet_id = ub.bet_id
      LEFT JOIN (
        SELECT bet_id, side, SUM(amount) as total
        FROM user_bets
        GROUP BY bet_id, side
      ) winning_totals ON winning_totals.bet_id = ub.bet_id AND winning_totals.side = b.winning_side
      WHERE ub.user_id = user_record.id AND b.status = 'resolved';

      -- Count resolved bets for win rate
      SELECT COUNT(*) INTO resolved_bets_count
      FROM user_bets ub
      JOIN bets b ON b.id = ub.bet_id
      WHERE ub.user_id = user_record.id AND b.status = 'resolved';

      -- Calculate win rate
      IF resolved_bets_count > 0 THEN
        calculated_win_rate := (wins_count::DECIMAL / resolved_bets_count) * 100;
      END IF;

      -- Calculate streaks
      DECLARE
        temp_streak INTEGER := 0;
        bet_outcome RECORD;
      BEGIN
        FOR bet_outcome IN
          SELECT
            CASE WHEN b.winning_side = ub.side THEN 1 ELSE 0 END as won
          FROM user_bets ub
          JOIN bets b ON b.id = ub.bet_id
          WHERE ub.user_id = user_record.id AND b.status = 'resolved'
          ORDER BY b.resolved_at DESC
        LOOP
          IF bet_outcome.won = 1 THEN
            temp_streak := temp_streak + 1;
            IF temp_streak > best_streak_count THEN
              best_streak_count := temp_streak;
            END IF;
          ELSE
            temp_streak := 0;
          END IF;
        END LOOP;
        current_streak_count := temp_streak;
      END;

      -- Upsert leaderboard entry
      INSERT INTO leaderboard (
        user_id,
        username,
        total_bets,
        total_wins,
        total_losses,
        win_rate,
        total_wagered,
        total_winnings,
        net_profit,
        current_streak,
        best_streak,
        last_updated
      ) VALUES (
        user_record.id,
        user_record.username,
        total_bets_count,
        wins_count,
        losses_count,
        calculated_win_rate,
        total_wagered_amount,
        total_winnings_amount,
        total_winnings_amount - total_wagered_amount,
        current_streak_count,
        best_streak_count,
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        total_bets = EXCLUDED.total_bets,
        total_wins = EXCLUDED.total_wins,
        total_losses = EXCLUDED.total_losses,
        win_rate = EXCLUDED.win_rate,
        total_wagered = EXCLUDED.total_wagered,
        total_winnings = EXCLUDED.total_winnings,
        net_profit = EXCLUDED.net_profit,
        current_streak = EXCLUDED.current_streak,
        best_streak = EXCLUDED.best_streak,
        last_updated = NOW();

      updated_count := updated_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_users', updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
