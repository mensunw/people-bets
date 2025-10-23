import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import '../styles/pages.css';
import '../styles/leaderboard.css';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  total_wagered: number;
  total_winnings: number;
  net_profit: number;
  current_streak: number;
  best_streak: number;
  last_updated: string;
}

type SortBy = 'net_profit' | 'win_rate' | 'total_wins' | 'current_streak';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('net_profit');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      const { data, error} = await supabase
        .from('leaderboard')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(100);

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeaderboard = async () => {
    setUpdating(true);
    try {
      // Get the current session to pass the auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the edge function instead of direct RPC
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-leaderboard`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update leaderboard');
      }

      // Refresh the leaderboard
      await fetchLeaderboard();
    } catch (error: any) {
      console.error('Error updating leaderboard:', error);
      alert(error.message || 'Failed to update leaderboard');
    } finally {
      setUpdating(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <button
            onClick={handleUpdateLeaderboard}
            disabled={updating}
            className="btn-primary"
          >
            {updating ? 'Updating...' : 'Update Leaderboard'}
          </button>
        </div>

        <div className="leaderboard-tabs">
          <button
            className={`tab ${sortBy === 'net_profit' ? 'active' : ''}`}
            onClick={() => setSortBy('net_profit')}
          >
            💰 Top Earners
          </button>
          <button
            className={`tab ${sortBy === 'win_rate' ? 'active' : ''}`}
            onClick={() => setSortBy('win_rate')}
          >
            📈 Best Win Rate
          </button>
          <button
            className={`tab ${sortBy === 'total_wins' ? 'active' : ''}`}
            onClick={() => setSortBy('total_wins')}
          >
            🏆 Most Wins
          </button>
          <button
            className={`tab ${sortBy === 'current_streak' ? 'active' : ''}`}
            onClick={() => setSortBy('current_streak')}
          >
            🔥 Hot Streak
          </button>
        </div>

        <div className="section">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner">Loading...</div>
            </div>
          ) : entries.length > 0 ? (
            <div className="leaderboard-list">
              {entries.map((entry, index) => (
                <div key={entry.id} className="leaderboard-item">
                  <div className="leaderboard-rank">{getRankIcon(index)}</div>

                  <div className="leaderboard-user">
                    <div className="user-avatar">{entry.username.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <div className="user-name">{entry.username}</div>
                      <div className="user-stats-mini">
                        {entry.total_bets} bets • {entry.total_wins}W-{entry.total_losses}L
                      </div>
                    </div>
                  </div>

                  <div className="leaderboard-stats">
                    {sortBy === 'net_profit' && (
                      <div className="stat-highlight">
                        <span className="stat-label">Net Profit</span>
                        <span className={`stat-value ${entry.net_profit >= 0 ? 'positive' : 'negative'}`}>
                          {entry.net_profit >= 0 ? '+' : ''}
                          {entry.net_profit.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {sortBy === 'win_rate' && (
                      <div className="stat-highlight">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{entry.win_rate.toFixed(1)}%</span>
                      </div>
                    )}

                    {sortBy === 'total_wins' && (
                      <div className="stat-highlight">
                        <span className="stat-label">Total Wins</span>
                        <span className="stat-value">{entry.total_wins}</span>
                      </div>
                    )}

                    {sortBy === 'current_streak' && (
                      <div className="stat-highlight">
                        <span className="stat-label">Current Streak</span>
                        <span className="stat-value">{entry.current_streak} 🔥</span>
                      </div>
                    )}

                    <div className="stat-secondary">
                      <span>💵 {entry.total_wagered.toLocaleString()} wagered</span>
                      <span>🎯 {entry.win_rate.toFixed(1)}% win rate</span>
                      <span>⚡ {entry.best_streak} best streak</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3>No Leaderboard Data Yet</h3>
              <p>Click "Update Leaderboard" to calculate rankings</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
