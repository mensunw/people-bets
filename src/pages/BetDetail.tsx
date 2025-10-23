import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ResolveBetModal } from '../components/ResolveBetModal';
import { useCountdown } from '../hooks/useCountdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Bet, UserBet } from '../types/index';
import '../styles/pages.css';
import '../styles/bet-detail.css';

interface BetWithDetails extends Bet {
  creator_username: string;
  group_name: string;
  total_over: number;
  total_under: number;
  participants_count: number;
}

interface UserBetWithProfile extends UserBet {
  username: string;
}

export function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bet, setBet] = useState<BetWithDetails | null>(null);
  const [userBets, setUserBets] = useState<UserBetWithProfile[]>([]);
  const [myBet, setMyBet] = useState<UserBet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<'over' | 'under'>('over');
  const [amount, setAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const { timeLeft, isExpired } = useCountdown(bet?.betting_window_end || '');

  useEffect(() => {
    fetchBetDetails();
  }, [id]);

  const fetchBetDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch bet details
      const { data: betData, error: betError } = await supabase
        .from('bets')
        .select(
          `
          *,
          creator:users_profile!creator_id(username),
          group:groups!group_id(name)
        `
        )
        .eq('id', id)
        .single();

      if (betError) throw betError;

      // Get bet statistics
      const { data: stats } = await supabase.rpc('get_bet_stats', {
        p_bet_id: id,
      });

      setBet({
        ...betData,
        creator_username: (betData.creator as any)?.username || 'Unknown',
        group_name: (betData.group as any)?.name || 'Unknown',
        total_over: stats?.total_over || 0,
        total_under: stats?.total_under || 0,
        participants_count: stats?.total_participants || 0,
      });

      // Fetch user bets
      const { data: userBetsData, error: userBetsError } = await supabase
        .from('user_bets')
        .select(
          `
          *,
          profile:users_profile!user_id(username)
        `
        )
        .eq('bet_id', id);

      if (userBetsError) throw userBetsError;

      const betsWithProfiles = (userBetsData || []).map((ub) => ({
        ...ub,
        username: (ub.profile as any)?.username || 'Unknown',
      }));

      setUserBets(betsWithProfiles);

      // Check if current user has already bet
      const myExistingBet = userBetsData?.find((ub) => ub.user_id === user?.id);
      setMyBet(myExistingBet || null);
    } catch (error) {
      console.error('Error fetching bet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!bet || !user?.id || !amount) return;

    setError('');
    setSuccess('');

    const betAmount = Number(amount);

    // Validation
    if (isNaN(betAmount) || betAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (betAmount > (user.profile?.currency_balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (myBet) {
      setError('You have already placed a bet on this');
      return;
    }

    if (bet.status !== 'open' || isExpired) {
      setError('Betting window has closed');
      return;
    }

    setPlacing(true);

    try {
      const { error: betError } = await supabase.from('user_bets').insert({
        bet_id: bet.id,
        user_id: user.id,
        side: selectedSide,
        amount: betAmount,
      });

      if (betError) throw betError;

      setSuccess(`Successfully placed ${betAmount} on ${selectedSide.toUpperCase()}!`);
      setAmount('');

      // Refresh data
      setTimeout(() => {
        fetchBetDetails();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error placing bet:', err);
      setError(err.message || 'Failed to place bet');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner">Loading bet details...</div>
        </div>
      </Layout>
    );
  }

  if (!bet) {
    return (
      <Layout>
        <div className="page-container">
          <div className="empty-state">
            <h3>Bet not found</h3>
          </div>
        </div>
      </Layout>
    );
  }

  const totalPot = bet.total_over + bet.total_under;
  const overPercentage = totalPot > 0 ? (bet.total_over / totalPot) * 100 : 50;
  const underPercentage = totalPot > 0 ? (bet.total_under / totalPot) * 100 : 50;
  const canBet = bet.status === 'open' && !isExpired && !myBet;

  return (
    <Layout>
      <div className="page-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        <div className="bet-detail-container">
          <div className="bet-detail-main">
            <div className="bet-detail-header">
              <div className="bet-type-badge-large">
                <span>📊</span>
                <span>Over or Under</span>
              </div>
              <span className={`status-badge ${bet.status}`}>
                {bet.status === 'resolved' ? 'Resolved' : isExpired ? 'Closed' : bet.status}
              </span>
            </div>

            <h1 className="bet-detail-title">{bet.title}</h1>
            <p className="bet-detail-description">{bet.description}</p>

            <div className="bet-detail-info">
              <div className="info-item">
                <span className="info-label">Creator</span>
                <span className="info-value">{bet.creator_username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Group</span>
                <span className="info-value">{bet.group_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Time Remaining</span>
                <span className={`info-value ${isExpired ? 'expired' : ''}`}>{timeLeft}</span>
              </div>
            </div>

            <div className="target-display">
              <div className="target-label">Target Number</div>
              <div className="target-number">{bet.target_number}</div>
            </div>

            <div className="odds-display">
              <h3>Current Odds</h3>
              <div className="odds-bars">
                <div className="odds-row">
                  <span className="odds-label">OVER</span>
                  <div className="odds-bar">
                    <div className="odds-fill over" style={{ width: `${overPercentage}%` }} />
                    <span className="odds-text">{overPercentage.toFixed(1)}%</span>
                  </div>
                  <span className="odds-amount">{bet.total_over.toLocaleString()}</span>
                </div>
                <div className="odds-row">
                  <span className="odds-label">UNDER</span>
                  <div className="odds-bar">
                    <div className="odds-fill under" style={{ width: `${underPercentage}%` }} />
                    <span className="odds-text">{underPercentage.toFixed(1)}%</span>
                  </div>
                  <span className="odds-amount">{bet.total_under.toLocaleString()}</span>
                </div>
              </div>
              <div className="total-pot">
                Total Pot: <strong>{totalPot.toLocaleString()}</strong> · Participants:{' '}
                <strong>{bet.participants_count}</strong>
              </div>
            </div>

            {bet.status === 'resolved' && bet.winning_side && (
              <div className={`result-banner ${bet.winning_side}`}>
                <span className="result-icon">🏆</span>
                <span className="result-text">
                  {bet.winning_side.toUpperCase()} WINS!
                </span>
              </div>
            )}

            {bet.creator_id === user?.id && bet.status !== 'resolved' && isExpired && (
              <button
                onClick={() => setIsResolveModalOpen(true)}
                className="btn-primary resolve-bet-btn"
              >
                Resolve Bet
              </button>
            )}
          </div>

          <div className="bet-detail-sidebar">
            {myBet ? (
              <div className="my-bet-card">
                <h3>Your Bet</h3>
                <div className="my-bet-info">
                  <div className="my-bet-side">{myBet.side.toUpperCase()}</div>
                  <div className="my-bet-amount">{myBet.amount.toLocaleString()}</div>
                </div>
                <p className="my-bet-note">Good luck!</p>
              </div>
            ) : canBet ? (
              <div className="place-bet-card">
                <h3>Place Your Bet</h3>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="balance-display">
                  Your Balance: <strong>{user?.profile?.currency_balance?.toLocaleString()}</strong>
                </div>

                <div className="side-selector">
                  <button
                    className={`side-btn over ${selectedSide === 'over' ? 'active' : ''}`}
                    onClick={() => setSelectedSide('over')}
                  >
                    <span className="side-icon">📈</span>
                    <span>OVER</span>
                  </button>
                  <button
                    className={`side-btn under ${selectedSide === 'under' ? 'active' : ''}`}
                    onClick={() => setSelectedSide('under')}
                  >
                    <span className="side-icon">📉</span>
                    <span>UNDER</span>
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="amount">Amount</label>
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    max={user?.profile?.currency_balance || 0}
                    disabled={placing}
                  />
                </div>

                <button
                  onClick={handlePlaceBet}
                  disabled={placing || !amount}
                  className="btn-primary place-bet-btn"
                >
                  {placing ? 'Placing Bet...' : 'Confirm Bet'}
                </button>
              </div>
            ) : (
              <div className="closed-bet-card">
                <h3>{isExpired ? 'Betting Closed' : 'Already Bet'}</h3>
                <p>
                  {isExpired
                    ? 'The betting window has ended'
                    : myBet
                    ? 'You have already placed a bet'
                    : 'Betting is not available'}
                </p>
              </div>
            )}

            <div className="participants-card">
              <h3>Participants ({userBets.length})</h3>
              <div className="participants-list">
                {userBets.map((ub) => (
                  <div key={ub.id} className="participant-item">
                    <div className="participant-info">
                      <span className="participant-avatar">
                        {ub.username.charAt(0).toUpperCase()}
                      </span>
                      <span className="participant-name">{ub.username}</span>
                    </div>
                    <div className="participant-bet">
                      <span className={`participant-side ${ub.side}`}>
                        {ub.side.toUpperCase()}
                      </span>
                      <span className="participant-amount">{ub.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ResolveBetModal
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          betId={bet.id}
          betTitle={bet.title}
          targetNumber={bet.target_number}
          onSuccess={() => {
            fetchBetDetails();
            window.location.reload();
          }}
        />
      </div>
    </Layout>
  );
}
