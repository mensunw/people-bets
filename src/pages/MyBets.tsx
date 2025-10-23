import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { BetCard } from '../components/BetCard';
import { ActiveBetCard } from '../components/ActiveBetCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/pages.css';

type TabType = 'active' | 'created' | 'past';

export function MyBets() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeBets, setActiveBets] = useState<any[]>([]);
  const [createdBets, setCreatedBets] = useState<any[]>([]);
  const [pastBets, setPastBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBets();
  }, [user?.id]);

  const fetchBets = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch bets user has placed with their bet details
      const { data: userBetsData, error: userBetsError } = await supabase
        .from('user_bets')
        .select('bet_id, side, amount')
        .eq('user_id', user.id);

      if (userBetsError) throw userBetsError;

      const placedBetIds = userBetsData.map((ub) => ub.bet_id);

      if (placedBetIds.length > 0) {
        // Get active bets (open or closed but not resolved)
        const { data: activeBetsData } = await supabase
          .from('bets')
          .select(
            `
            *,
            creator:users_profile!creator_id(username),
            group:groups!group_id(name)
          `
          )
          .in('id', placedBetIds)
          .in('status', ['open', 'closed'])
          .order('created_at', { ascending: false });

        // Get past bets (resolved)
        const { data: pastBetsData } = await supabase
          .from('bets')
          .select(
            `
            *,
            creator:users_profile!creator_id(username),
            group:groups!group_id(name)
          `
          )
          .in('id', placedBetIds)
          .eq('status', 'resolved')
          .order('resolved_at', { ascending: false });

        // Get stats for all bets and calculate potential winnings
        const betsWithStatsActive = await Promise.all(
          (activeBetsData || []).map(async (bet) => {
            const { data: stats } = await supabase.rpc('get_bet_stats', {
              p_bet_id: bet.id,
            });

            // Find user's bet on this bet
            const userBet = userBetsData.find((ub) => ub.bet_id === bet.id);

            // Calculate potential winnings
            let potentialWinnings = 0;
            if (userBet) {
              const totalPool = (stats?.total_over || 0) + (stats?.total_under || 0);
              const winningSideTotal = userBet.side === 'over'
                ? (stats?.total_over || 0)
                : (stats?.total_under || 0);

              if (winningSideTotal > 0) {
                potentialWinnings = Math.floor((userBet.amount / winningSideTotal) * totalPool);
              }
            }

            return {
              ...bet,
              creator_username: (bet.creator as any)?.username || 'Unknown',
              group_name: (bet.group as any)?.name || 'Unknown',
              total_over: stats?.total_over || 0,
              total_under: stats?.total_under || 0,
              participants_count: stats?.total_participants || 0,
              user_bet_amount: userBet?.amount || 0,
              user_bet_side: userBet?.side,
              potential_winnings: potentialWinnings,
            };
          })
        );

        const betsWithStatsPast = await Promise.all(
          (pastBetsData || []).map(async (bet) => {
            const { data: stats } = await supabase.rpc('get_bet_stats', {
              p_bet_id: bet.id,
            });

            // Find user's bet on this bet
            const userBet = userBetsData.find((ub) => ub.bet_id === bet.id);

            return {
              ...bet,
              creator_username: (bet.creator as any)?.username || 'Unknown',
              group_name: (bet.group as any)?.name || 'Unknown',
              total_over: stats?.total_over || 0,
              total_under: stats?.total_under || 0,
              participants_count: stats?.total_participants || 0,
              user_bet_amount: userBet?.amount || 0,
              user_bet_side: userBet?.side,
            };
          })
        );

        setActiveBets(betsWithStatsActive);
        setPastBets(betsWithStatsPast);
      }

      // Fetch bets user has created
      const { data: createdBetsData } = await supabase
        .from('bets')
        .select(
          `
          *,
          creator:users_profile!creator_id(username),
          group:groups!group_id(name)
        `
        )
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      const betsWithStatsCreated = await Promise.all(
        (createdBetsData || []).map(async (bet) => {
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

      setCreatedBets(betsWithStatsCreated);
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'active':
        return activeBets.length > 0 ? (
          <div className="active-bets-list">
            {activeBets.map((bet) => (
              <ActiveBetCard key={bet.id} bet={bet} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎲</div>
            <h3>No Active Bets</h3>
            <p>You haven't placed any active bets yet!</p>
          </div>
        );

      case 'created':
        return createdBets.length > 0 ? (
          <div className="bets-grid">
            {createdBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No Created Bets</h3>
            <p>You haven't created any bets yet. Create one to get started!</p>
          </div>
        );

      case 'past':
        return pastBets.length > 0 ? (
          <div className="bets-grid">
            {pastBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <h3>No Past Bets</h3>
            <p>No resolved bets yet!</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Bets ({activeBets.length})
          </button>
          <button
            className={`tab ${activeTab === 'created' ? 'active' : ''}`}
            onClick={() => setActiveTab('created')}
          >
            Created Bets ({createdBets.length})
          </button>
          <button
            className={`tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Bets ({pastBets.length})
          </button>
        </div>

        <div className="section">{renderContent()}</div>
      </div>
    </Layout>
  );
}
