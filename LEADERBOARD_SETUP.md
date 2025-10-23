# Leaderboard Feature Setup

## Overview
The leaderboard system tracks and displays user betting statistics including wins, losses, profit, and streaks.

## Database Setup

### 1. Apply the Migration
Run the initial schema SQL in your Supabase Dashboard to create the `leaderboard` table:
- Go to Supabase Dashboard → SQL Editor
- Run `/supabase/migrations/20250101000000_initial_schema.sql`

This creates:
- `leaderboard` table with columns for all stats
- Indexes for fast sorting
- RLS policy (anyone can view)
- `update_leaderboard()` function to calculate stats

### 2. Initial Population
After creating some bets and resolving them, populate the leaderboard:

```sql
SELECT update_leaderboard();
```

## Features

### Leaderboard Metrics Calculated:
- **Total Bets** - Number of bets placed
- **Wins/Losses** - Resolved bet outcomes
- **Win Rate** - Percentage of bets won
- **Total Wagered** - Sum of all bet amounts
- **Total Winnings** - Actual winnings received (proportional distribution)
- **Net Profit** - Winnings minus wagered
- **Current Streak** - Consecutive wins currently active
- **Best Streak** - Highest consecutive win streak ever

### Leaderboard Views:
1. **💰 Top Earners** - Sorted by net profit
2. **📈 Best Win Rate** - Sorted by win percentage
3. **🏆 Most Wins** - Sorted by total wins
4. **🔥 Hot Streak** - Sorted by current win streak

### Manual Update
Click "Update Leaderboard" button on the leaderboard page to recalculate all stats.

## Edge Function (Optional)

### Deploy the Edge Function
```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy update-leaderboard
```

### Schedule Automatic Updates
The edge function can be configured to run on a schedule (e.g., every hour).

Edit `/supabase/functions/update-leaderboard/index.ts` and uncomment the cron section at the bottom.

### Manual Trigger via Edge Function
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-leaderboard \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Usage

### Accessing the Leaderboard
1. Navigate to the app
2. Click "🏆 Leaderboard" in the sidebar
3. Click "Update Leaderboard" to calculate latest stats
4. Switch between different sorting views

### How Stats are Calculated

**Winnings Calculation:**
- When a bet is resolved, winners get proportional share of the total pot
- Formula: `(user_bet_amount / winning_side_total) * total_pot`
- This is tracked in real-time when bets are resolved

**Streak Calculation:**
- Looks at resolved bets in chronological order
- Increments streak for each consecutive win
- Resets to 0 on a loss
- Tracks both current streak and best streak ever

## Notes

- Leaderboard only includes users who have placed at least one bet
- Stats are calculated from resolved bets only
- Pending/active bets don't affect leaderboard rankings
- Manual updates are required (unless edge function cron is enabled)
- All users can view the leaderboard (public rankings)

## Troubleshooting

**No data showing:**
- Ensure you've resolved at least one bet
- Click "Update Leaderboard" to populate data
- Check browser console for errors

**Stats seem incorrect:**
- Verify bets are properly resolved in the database
- Re-run `SELECT update_leaderboard();` in SQL Editor
- Check that the `resolve_bet` function is working correctly
