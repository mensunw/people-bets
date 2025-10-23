import { useNavigate } from 'react-router-dom';
import { useCountdown } from '../hooks/useCountdown';
import '../styles/active-bet-card.css';

interface ActiveBetCardProps {
  bet: {
    id: string;
    title: string;
    description: string;
    target_number: number;
    betting_window_end: string;
    status: string;
    winning_side: string | null;
    creator_username: string;
    group_name: string;
    total_over: number;
    total_under: number;
    participants_count: number;
    user_bet_amount: number;
    user_bet_side: 'over' | 'under';
    potential_winnings: number;
  };
}

export function ActiveBetCard({ bet }: ActiveBetCardProps) {
  const navigate = useNavigate();
  const { timeLeft, isExpired } = useCountdown(bet.betting_window_end);

  const totalPool = bet.total_over + bet.total_under;
  const overPercentage = totalPool > 0 ? (bet.total_over / totalPool) * 100 : 50;
  const underPercentage = totalPool > 0 ? (bet.total_under / totalPool) * 100 : 50;

  const potentialProfit = bet.potential_winnings - bet.user_bet_amount;
  const returnMultiplier = bet.user_bet_amount > 0 ? bet.potential_winnings / bet.user_bet_amount : 1;

  return (
    <div className="active-bet-card" onClick={() => navigate(`/bets/${bet.id}`)}>
      <div className="active-bet-main">
        <div className="active-bet-header">
          <h3 className="active-bet-title">{bet.title}</h3>
          <span className={`bet-status ${bet.status}`}>
            {bet.status === 'open' ? '🟢 Open' : '🟠 Closed'}
          </span>
        </div>

        <p className="active-bet-description">{bet.description}</p>

        <div className="active-bet-target">
          Target: <strong>{bet.target_number}</strong>
        </div>

        <div className="active-bet-meta">
          <span className="bet-group">📁 {bet.group_name}</span>
          <span className="bet-creator">👤 {bet.creator_username}</span>
          <span className="bet-participants">👥 {bet.participants_count}</span>
        </div>

        <div className="odds-bars">
          <div className="odds-bar">
            <div className="odds-label">
              <span>📈 OVER</span>
              <span>{bet.total_over.toLocaleString()}</span>
            </div>
            <div className="odds-progress">
              <div className="odds-fill over" style={{ width: `${overPercentage}%` }} />
            </div>
          </div>

          <div className="odds-bar">
            <div className="odds-label">
              <span>📉 UNDER</span>
              <span>{bet.total_under.toLocaleString()}</span>
            </div>
            <div className="odds-progress">
              <div className="odds-fill under" style={{ width: `${underPercentage}%` }} />
            </div>
          </div>
        </div>

        {bet.status === 'open' && (
          <div className="bet-countdown">
            ⏱️ {isExpired ? 'Betting closed' : `${timeLeft} remaining`}
          </div>
        )}
      </div>

      <div className="active-bet-winnings">
        <div className="your-bet-badge">
          <span className="badge-label">Your Bet</span>
          <div className={`bet-side-badge ${bet.user_bet_side}`}>
            {bet.user_bet_side === 'over' ? '📈 OVER' : '📉 UNDER'}
          </div>
          <div className="bet-amount">{bet.user_bet_amount.toLocaleString()}</div>
        </div>

        <div className="winnings-info">
          <div className="winnings-label">Potential Winnings</div>
          <div className="winnings-amount">{bet.potential_winnings.toLocaleString()}</div>
          <div className="winnings-profit">
            {potentialProfit > 0 ? '+' : ''}
            {potentialProfit.toLocaleString()} profit
          </div>
          <div className="winnings-multiplier">{returnMultiplier.toFixed(2)}x return</div>
        </div>
      </div>
    </div>
  );
}
