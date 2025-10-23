import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useUserStats } from '../hooks/useUserStats';
import { supabase } from '../lib/supabase';
import '../styles/pages.css';

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
  const navigate = useNavigate();
  const [history, setHistory] = useState<BetHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

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
