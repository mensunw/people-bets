import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
};

interface BettingStats {
  daily_stats: {
    date: string;
    total_wagered: number;
    total_won: number;
    net_profit: number;
    bets_placed: number;
    bets_won: number;
  }[];
  cumulative_stats: {
    date: string;
    cumulative_profit: number;
    cumulative_wagered: number;
    cumulative_bets: number;
    win_rate: number;
  }[];
  overall_stats: {
    total_bets: number;
    total_wins: number;
    total_losses: number;
    total_wagered: number;
    total_winnings: number;
    net_profit: number;
    win_rate: number;
    best_win: number;
    worst_loss: number;
  };
  monthly_performance: {
    month: string;
    bets: number;
    wins: number;
    profit: number;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user_id from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const timeRange = url.searchParams.get('range') || '30'; // days

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id parameter required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate date range
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch user's bets with outcomes and bet stats
    const { data: userBets, error: betsError } = await supabaseClient
      .from('user_bets')
      .select(`
        id,
        amount,
        side,
        created_at,
        bet_id,
        bets (
          id,
          status,
          winning_side,
          created_at,
          betting_window_end
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (betsError) throw betsError;

    // For resolved bets, we need to calculate winnings based on bet stats
    // Fetch bet stats for all resolved bets
    const resolvedBetIds = userBets
      ?.filter((ub: any) => ub.bets?.status === 'resolved')
      .map((ub: any) => ub.bet_id) || [];

    let betStatsMap = new Map();

    if (resolvedBetIds.length > 0) {
      for (const betId of resolvedBetIds) {
        const { data: statsData } = await supabaseClient.rpc('get_bet_stats', {
          p_bet_id: betId,
        });

        if (statsData && statsData.length > 0) {
          betStatsMap.set(betId, statsData[0]);
        }
      }
    }

    // Process statistics
    const stats = processUserBets(userBets || [], betStatsMap);

    // Generate ETag from data content
    const dataString = JSON.stringify(stats);
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(dataString)
    );
    const etag = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check client's cached version
    const clientETag = req.headers.get('if-none-match');

    if (clientETag === etag) {
      // Data hasn't changed, return 304 Not Modified
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        },
      });
    }

    // Return fresh data with ETag
    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'ETag': etag,
          'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        },
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function processUserBets(userBets: any[], betStatsMap: Map<string, any>): BettingStats {
  // Group bets by day
  const dailyMap = new Map<string, any>();
  const monthlyMap = new Map<string, any>();

  let totalBets = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalWagered = 0;
  let totalWinnings = 0;
  let bestWin = 0;
  let worstLoss = 0;

  userBets.forEach((userBet: any) => {
    const bet = userBet.bets;
    const date = new Date(userBet.created_at).toISOString().split('T')[0];
    const month = date.substring(0, 7); // YYYY-MM

    // Initialize daily stats
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        total_wagered: 0,
        total_won: 0,
        net_profit: 0,
        bets_placed: 0,
        bets_won: 0,
      });
    }

    // Initialize monthly stats
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        bets: 0,
        wins: 0,
        profit: 0,
      });
    }

    const daily = dailyMap.get(date);
    const monthly = monthlyMap.get(month);

    // Update daily stats
    daily.bets_placed++;
    daily.total_wagered += userBet.amount;
    monthly.bets++;
    totalBets++;
    totalWagered += userBet.amount;

    // Check if bet is resolved
    if (bet?.status === 'resolved' && bet?.winning_side) {
      const won = userBet.side === bet.winning_side;

      // Calculate winnings based on bet stats
      let winnings = 0;
      if (won) {
        const betStats = betStatsMap.get(userBet.bet_id);
        if (betStats) {
          const totalPot = betStats.total_over + betStats.total_under;
          const winningSideTotal = bet.winning_side === 'over'
            ? betStats.total_over
            : betStats.total_under;

          // Proportional distribution: (user_bet / winning_side_total) * total_pot
          if (winningSideTotal > 0) {
            winnings = Math.round((userBet.amount / winningSideTotal) * totalPot);
          }
        }
      }

      const profit = won ? (winnings - userBet.amount) : -userBet.amount;

      if (won) {
        daily.bets_won++;
        daily.total_won += winnings;
        monthly.wins++;
        totalWins++;
        totalWinnings += winnings;

        if (profit > bestWin) bestWin = profit;
      } else {
        totalLosses++;
        if (profit < worstLoss) worstLoss = profit;
      }

      daily.net_profit += profit;
      monthly.profit += profit;
    }
  });

  // Convert to arrays and sort
  const daily_stats = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Calculate cumulative stats
  let cumulativeProfit = 0;
  let cumulativeWagered = 0;
  let cumulativeBets = 0;
  let cumulativeWins = 0;

  const cumulative_stats = daily_stats.map(day => {
    cumulativeProfit += day.net_profit;
    cumulativeWagered += day.total_wagered;
    cumulativeBets += day.bets_placed;
    cumulativeWins += day.bets_won;

    return {
      date: day.date,
      cumulative_profit: Math.round(cumulativeProfit),
      cumulative_wagered: Math.round(cumulativeWagered),
      cumulative_bets: cumulativeBets,
      win_rate: cumulativeBets > 0
        ? Math.round((cumulativeWins / cumulativeBets) * 100 * 10) / 10
        : 0,
    };
  });

  const monthly_performance = Array.from(monthlyMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const netProfit = totalWinnings - totalWagered;
  const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;

  return {
    daily_stats,
    cumulative_stats,
    overall_stats: {
      total_bets: totalBets,
      total_wins: totalWins,
      total_losses: totalLosses,
      total_wagered: Math.round(totalWagered),
      total_winnings: Math.round(totalWinnings),
      net_profit: Math.round(netProfit),
      win_rate: Math.round(winRate * 10) / 10,
      best_win: Math.round(bestWin),
      worst_loss: Math.round(worstLoss),
    },
    monthly_performance,
  };
}
