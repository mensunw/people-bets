import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Bet } from '../types/index';

interface BetWithDetails extends Bet {
  creator_username: string;
  group_name: string;
  total_over: number;
  total_under: number;
  participants_count: number;
}

export function useBets() {
  const { user } = useAuth();
  const [bets, setBets] = useState<BetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBets = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all groups the user is a member of
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const memberGroupIds = memberGroups.map((m) => m.group_id);

      if (memberGroupIds.length === 0) {
        setBets([]);
        setLoading(false);
        return;
      }

      // Fetch bets from user's groups
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(
          `
          *,
          creator:users_profile!creator_id(username),
          group:groups!group_id(name)
        `
        )
        .in('group_id', memberGroupIds)
        .order('created_at', { ascending: false });

      if (betsError) throw betsError;

      // Get bet statistics for each bet
      const betsWithStats = await Promise.all(
        (betsData || []).map(async (bet) => {
          const { data: stats } = await supabase.rpc('get_bet_stats', {
            p_bet_id: bet.id,
          });

          return {
            ...bet,
            creator_username: (bet.creator as any)?.username || 'Unknown',
            group_name: (bet.group as any)?.name || 'Unknown',
            total_over: stats?.total_over || 0,
            total_under: stats?.total_under || 0,
            participants_count: stats?.total_participants || 0,
          };
        })
      );

      setBets(betsWithStats);
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, [user?.id]);

  return { bets, loading, refetch: fetchBets };
}
