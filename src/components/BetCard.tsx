import { useNavigate } from 'react-router-dom';
import { useCountdown } from '../hooks/useCountdown';
import '../styles/bets.css';

interface BetCardProps {
  bet: {
    id: string;
    title: string;
    description: string;
    bet_type: string;
    target_number: number;
    betting_window_end: string;
    status: 'open' | 'closed' | 'resolved';
    winning_side: 'over' | 'under' | null;
    creator_username: string;
    group_name: string;
    total_over: number;
    total_under: number;
    participants_count: number;
  };
}

export function BetCard({ bet }: BetCardProps) {
  const navigate = useNavigate();
  const { timeLeft, isExpired } = useCountdown(bet.betting_window_end);

  const totalPot = bet.total_over + bet.total_under;
  const overPercentage = totalPot > 0 ? (bet.total_over / totalPot) * 100 : 50;
  const underPercentage = totalPot > 0 ? (bet.total_under / totalPot) * 100 : 50;

  const getStatusBadge = () => {
    if (bet.status === 'resolved') {
      return <span className="status-badge resolved">Resolved</span>;
    } else if (bet.status === 'closed' || isExpired) {
      return <span className="status-badge closed">Closed</span>;
    } else {
      return <span className="status-badge open">Open</span>;
    }
  };

  const handleClick = () => {
    // Navigate to bet detail page (to be created in Phase 9)
    navigate(`/bets/${bet.id}`);
  };

  return (
    <div className="bet-card" onClick={handleClick}>
      <div className="bet-card-header">
        <div className="bet-type-badge">
          <span>📊</span>
          <span>Over or Under</span>
        </div>
        {getStatusBadge()}
      </div>

      <h3 className="bet-title">{bet.title}</h3>
      <p className="bet-description">{bet.description}</p>

      <div className="bet-target">
        <div className="target-label">Target Number</div>
        <div className="target-value">{bet.target_number}</div>
      </div>

      <div className="bet-stats">
        <div className="stat-row">
          <span className="stat-label">Over</span>
          <div className="stat-bar">
            <div className="stat-fill over" style={{ width: `${overPercentage}%` }} />
          </div>
          <span className="stat-value">{bet.total_over.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Under</span>
          <div className="stat-bar">
            <div className="stat-fill under" style={{ width: `${underPercentage}%` }} />
          </div>
          <span className="stat-value">{bet.total_under.toLocaleString()}</span>
        </div>
      </div>

      <div className="bet-footer">
        <div className="bet-meta">
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            <span>{bet.creator_username}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span>{bet.group_name}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🎲</span>
            <span>{bet.participants_count} bets</span>
          </div>
        </div>

        <div className="bet-countdown">
          <span className="countdown-icon">⏰</span>
          <span className={isExpired ? 'countdown-expired' : 'countdown-active'}>{timeLeft}</span>
        </div>
      </div>

      {bet.status === 'resolved' && bet.winning_side && (
        <div className={`winning-banner ${bet.winning_side}`}>
          <span>🏆 {bet.winning_side.toUpperCase()} wins!</span>
        </div>
      )}
    </div>
  );
}
