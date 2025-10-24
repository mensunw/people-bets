-- =====================================================
-- CLEAR DATABASE - Use this to reset your database for testing
-- =====================================================

-- WARNING: This will delete ALL data in your tables!
-- Only use this for development/testing purposes

-- Drop all tables (cascades to remove foreign key constraints)
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS user_bets CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS close_expired_bets() CASCADE;
DROP FUNCTION IF EXISTS deduct_bet_amount() CASCADE;
DROP FUNCTION IF EXISTS claim_daily_currency() CASCADE;
DROP FUNCTION IF EXISTS resolve_bet(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_bet_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_leaderboard() CASCADE;

-- Note: To clear auth.users, you need to do it through the Supabase dashboard
-- Go to Authentication > Users and delete users manually
-- Or run this query:
-- DELETE FROM auth.users;
