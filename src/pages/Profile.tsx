import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useUserStats } from '../hooks/useUserStats';
import { useUserBettingStats } from '../hooks/useUserBettingStats';
import { supabase } from '../lib/supabase';
import '../styles/pages.css';
import '../styles/stats-chart.css';

interface BetHistory {
  id: string;
  bet_id: string;
  side: 'over' | 'under';
  amount: number;
  created_at: string;
  bet: {
    title: string;
    status: string;
    winning_side: string | null;
  };
}

export function Profile() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useUserStats();
  const { stats: bettingStats, loading: bettingStatsLoading, refetch } = useUserBettingStats({
    userId: user?.id || null,
    timeRange: 30,
    enabled: true,
  });
  const navigate = useNavigate();
  const [history, setHistory] = useState<BetHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [chartView, setChartView] = useState<'profit' | 'winrate'>('profit');

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_bets')
        .select('*, bet:bets!inner(title, status, winning_side)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data as any);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getOutcome = (bet: BetHistory) => {
    if (bet.bet.status !== 'resolved') return 'Pending';
    if (bet.bet.winning_side === bet.side) return 'Won';
    return 'Lost';
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{user?.profile?.username?.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <h2>{user?.profile?.username}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-joined">
                Member since {user?.profile?.created_at && formatDate(user.profile.created_at)}
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-value">
                {user?.profile?.currency_balance?.toLocaleString() || 0}
              </div>
              <div className="profile-stat-label">Currency Balance</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">
                {statsLoading ? '...' : stats.total_bets}
              </div>
              <div className="profile-stat-label">Total Bets</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">{statsLoading ? '...' : stats.wins}</div>
              <div className="profile-stat-label">Wins</div>
            </div>

            <div className="profile-stat">
              <div className="profile-stat-value">
                {statsLoading ? '...' : `${stats.win_rate.toFixed(1)}%`}
              </div>
              <div className="profile-stat-label">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Betting Performance Chart */}
        <div className="section">
          <div className="section-header">
            <h3>Performance Over Last 30 Days</h3>
            <div className="chart-controls">
              <button
                className={`chart-toggle ${chartView === 'profit' ? 'active' : ''}`}
                onClick={() => setChartView('profit')}
              >
                Cumulative Profit
              </button>
              <button
                className={`chart-toggle ${chartView === 'winrate' ? 'active' : ''}`}
                onClick={() => setChartView('winrate')}
              >
                Win Rate
              </button>
              <button className="btn-refresh" onClick={refetch}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {bettingStatsLoading ? (
            <div className="loading-spinner">Loading chart data...</div>
          ) : bettingStats && bettingStats.cumulative_stats.length > 0 ? (
            <>
              <div className="stats-chart">
                {chartView === 'profit' ? (
                  <div className="chart-container">
                    {bettingStats.cumulative_stats.map((day, index) => {
                      const maxProfit = Math.max(
                        ...bettingStats.cumulative_stats.map((d) => Math.abs(d.cumulative_profit))
                      );
                      const height = maxProfit > 0
                        ? (Math.abs(day.cumulative_profit) / maxProfit) * 100
                        : 0;
                      const isPositive = day.cumulative_profit >= 0;

                      return (
                        <div key={day.date} className="chart-bar-wrapper">
                          <div className="chart-bar-container">
                            <div
                              className={`chart-bar ${isPositive ? 'positive' : 'negative'}`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${isPositive ? '+' : ''}${day.cumulative_profit}`}
                            />
                          </div>
                          {index % 5 === 0 && (
                            <div className="chart-label">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="chart-container">
                    {bettingStats.cumulative_stats.map((day, index) => {
                      const height = day.win_rate;

                      return (
                        <div key={day.date} className="chart-bar-wrapper">
                          <div className="chart-bar-container">
                            <div
                              className="chart-bar positive"
                              style={{ height: `${height}%` }}
                              title={`${day.date}: ${day.win_rate}%`}
                            />
                          </div>
                          {index % 5 === 0 && (
                            <div className="chart-label">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detailed Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-label">Best Win</div>
                  <div className="stat-card-value positive">
                    +{bettingStats.overall_stats.best_win.toLocaleString()}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Worst Loss</div>
                  <div className="stat-card-value negative">
                    {bettingStats.overall_stats.worst_loss.toLocaleString()}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Total Wagered</div>
                  <div className="stat-card-value">
                    {bettingStats.overall_stats.total_wagered.toLocaleString()}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Net Profit</div>
                  <div
                    className={`stat-card-value ${
                      bettingStats.overall_stats.net_profit >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    {bettingStats.overall_stats.net_profit >= 0 ? '+' : ''}
                    {bettingStats.overall_stats.net_profit.toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No betting data available for the last 30 days</p>
            </div>
          )}
        </div>

        <div className="section">
          <h3>Recent Betting History</h3>
          {historyLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : history.length > 0 ? (
            <div className="history-list">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="history-item"
                  onClick={() => navigate(`/bets/${h.bet_id}`)}
                >
                  <div className="history-main">
                    <div className="history-title">{h.bet.title}</div>
                    <div className="history-meta">
                      <span className={`history-side ${h.side}`}>{h.side.toUpperCase()}</span>
                      <span className="history-amount">{h.amount.toLocaleString()}</span>
                      <span className="history-date">
                        {new Date(h.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className={`history-outcome ${getOutcome(h).toLowerCase()}`}>
                    {getOutcome(h)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No betting history yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
