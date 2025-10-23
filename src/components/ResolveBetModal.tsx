import { useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/modal.css';
import '../styles/resolve-bet.css';

interface ResolveBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  betId: string;
  betTitle: string;
  targetNumber: number;
  onSuccess: () => void;
}

export function ResolveBetModal({
  isOpen,
  onClose,
  betId,
  betTitle,
  targetNumber,
  onSuccess,
}: ResolveBetModalProps) {
  const [selectedWinner, setSelectedWinner] = useState<'over' | 'under'>('over');
  const [actualResult, setActualResult] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const handleResolve = async () => {
    setError('');

    if (!actualResult) {
      setError('Please enter the actual result');
      return;
    }

    const result = Number(actualResult);
    if (isNaN(result)) {
      setError('Please enter a valid number');
      return;
    }

    setResolving(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('resolve_bet', {
        p_bet_id: betId,
        p_winning_side: selectedWinner,
      });

      console.log('Resolve bet response:', { data, error: rpcError });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to resolve bet');
      }

      console.log('Bet resolved successfully:', data);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error resolving bet:', err);
      setError(err.message || 'Failed to resolve bet');
    } finally {
      setResolving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resolve Bet</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="resolve-bet-content">
          <div className="resolve-info">
            <h3>{betTitle}</h3>
            <div className="target-info">
              Target Number: <strong>{targetNumber}</strong>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="actualResult">Actual Result</label>
            <input
              id="actualResult"
              type="number"
              step="0.01"
              value={actualResult}
              onChange={(e) => {
                setActualResult(e.target.value);
                const val = Number(e.target.value);
                if (!isNaN(val)) {
                  setSelectedWinner(val > targetNumber ? 'over' : 'under');
                }
              }}
              placeholder="Enter the actual result"
              disabled={resolving}
            />
            <small className="form-hint">
              Enter the final result to determine the winning side
            </small>
          </div>

          <div className="form-group">
            <label>Winning Side</label>
            <div className="winner-selector">
              <button
                type="button"
                className={`winner-btn over ${selectedWinner === 'over' ? 'active' : ''}`}
                onClick={() => setSelectedWinner('over')}
                disabled={resolving}
              >
                <span className="winner-icon">📈</span>
                <span className="winner-label">OVER</span>
                <span className="winner-desc">&gt; {targetNumber}</span>
              </button>
              <button
                type="button"
                className={`winner-btn under ${selectedWinner === 'under' ? 'active' : ''}`}
                onClick={() => setSelectedWinner('under')}
                disabled={resolving}
              >
                <span className="winner-icon">📉</span>
                <span className="winner-label">UNDER</span>
                <span className="winner-desc">&lt; {targetNumber}</span>
              </button>
            </div>
          </div>

          {actualResult && (
            <div className="result-preview">
              {Number(actualResult) > targetNumber ? (
                <div className="preview-message over">
                  Result {actualResult} is OVER {targetNumber} → OVER wins! 📈
                </div>
              ) : (
                <div className="preview-message under">
                  Result {actualResult} is UNDER {targetNumber} → UNDER wins! 📉
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={resolving}>
            Cancel
          </button>
          <button onClick={handleResolve} className="btn-primary" disabled={resolving}>
            {resolving ? 'Resolving...' : 'Resolve Bet'}
          </button>
        </div>
      </div>
    </div>
  );
}
