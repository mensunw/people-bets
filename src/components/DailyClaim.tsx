import { useState } from 'react';
import { useDailyClaim } from '../hooks/useDailyClaim';
import '../styles/daily-claim.css';

export function DailyClaim() {
  const { canClaim, timeUntilNextClaim, claiming, claimCurrency } = useDailyClaim();
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  const handleClaim = async () => {
    const result = await claimCurrency();

    if (result.success) {
      setNotification({
        show: true,
        message: `Successfully claimed ${result.amount} currency!`,
        type: 'success',
      });

      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
      }, 3000);
    } else {
      setNotification({
        show: true,
        message: result.message || 'Failed to claim currency',
        type: 'error',
      });

      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
      }, 3000);
    }
  };

  return (
    <>
      {notification.show && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}

      <div className="daily-claim-card">
        <div className="daily-claim-icon">🎁</div>
        <div className="daily-claim-content">
          <h3>Daily Currency Claim</h3>
          {canClaim ? (
            <p>Claim your free 500 currency now!</p>
          ) : (
            <p>
              Next claim available in: <strong>{timeUntilNextClaim}</strong>
            </p>
          )}
        </div>
        <button
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className={`claim-button ${canClaim ? 'available' : 'disabled'}`}
        >
          {claiming ? 'Claiming...' : canClaim ? 'Claim Now' : 'Claimed'}
        </button>
      </div>
    </>
  );
}
