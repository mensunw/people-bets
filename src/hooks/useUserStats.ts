import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserStats {
  total_bets: number;
  wins: number;
  losses: number;
  win_rate: number;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    total_bets: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user?.id]);

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all user bets
      const { data: userBets, error: betsError } = await supabase
        .from('user_bets')
        .select('*, bet:bets!inner(status, winning_side)')
        .eq('user_id', user.id);

      if (betsError) throw betsError;

      // Calculate statistics
      const resolvedBets = (userBets || []).filter((ub) => (ub.bet as any).status === 'resolved');
      const wins = resolvedBets.filter((ub) => (ub.bet as any).winning_side === ub.side).length;
      const losses = resolvedBets.length - wins;
      const winRate = resolvedBets.length > 0 ? (wins / resolvedBets.length) * 100 : 0;

      setStats({
        total_bets: userBets?.length || 0,
        wins,
        losses,
        win_rate: winRate,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading };
}
