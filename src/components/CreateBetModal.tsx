import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { GroupWithMemberCount } from '../types/index';
import '../styles/modal.css';
import '../styles/create-bet.css';

interface CreateBetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BetType = 'over_or_under' | 'multiple_choice' | 'yes_no';

export function CreateBetModal({ isOpen, onClose }: CreateBetModalProps) {
  const { user } = useAuth();
  const [selectedBetType, setSelectedBetType] = useState<BetType>('over_or_under');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [bettingWindowEnd, setBettingWindowEnd] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [leaderGroups, setLeaderGroups] = useState<GroupWithMemberCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLeaderGroups();
    }
  }, [isOpen, user?.id]);

  const fetchLeaderGroups = async () => {
    if (!user?.id) return;

    try {
      // Get all groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const memberGroupIds = memberGroups.map((m) => m.group_id);

      // Get groups where user is leader or it's the global group
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', memberGroupIds)
        .or(`leader_id.eq.${user.id},name.eq.Global`);

      if (groupsError) throw groupsError;

      const groupsWithInfo = groupsData.map((group) => ({
        ...group,
        member_count: 0,
        is_member: true,
        is_leader: group.leader_id === user.id,
      }));

      setLeaderGroups(groupsWithInfo);

      // Set default to Global if available
      const globalGroup = groupsWithInfo.find((g) => g.name === 'Global');
      if (globalGroup) {
        setSelectedGroupId(globalGroup.id);
      }
    } catch (error) {
      console.error('Error fetching leader groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    if (!targetNumber || isNaN(Number(targetNumber))) {
      setError('Please enter a valid target number');
      return;
    }

    if (!bettingWindowEnd) {
      setError('Please select a betting window end time');
      return;
    }

    const windowEnd = new Date(bettingWindowEnd);
    if (windowEnd <= new Date()) {
      setError('Betting window must end in the future');
      return;
    }

    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }

    setLoading(true);

    try {
      const { error: betError } = await supabase
        .from('bets')
        .insert({
          title: title.trim(),
          description: description.trim(),
          bet_type: selectedBetType,
          target_number: Number(targetNumber),
          creator_id: user?.id,
          group_id: selectedGroupId,
          betting_window_end: windowEnd.toISOString(),
          status: 'open',
        })
        .select()
        .single();

      if (betError) throw betError;

      // Reset form
      setTitle('');
      setDescription('');
      setTargetNumber('');
      setBettingWindowEnd('');
      setSelectedBetType('over_or_under');
      onClose();

      // Navigate to bet detail (we'll create this page later)
      alert('Bet created successfully!');
    } catch (err: any) {
      console.error('Error creating bet:', err);
      setError(err.message || 'Failed to create bet');
    } finally {
      setLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // Minimum 1 minute from now
    // Format for datetime-local input (YYYY-MM-DDTHH:mm) in local timezone
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-bet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Bet</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Bet Type Selector */}
          <div className="form-group">
            <label>Bet Type</label>
            <div className="bet-type-selector">
              <button
                type="button"
                className={`bet-type-option ${
                  selectedBetType === 'over_or_under' ? 'active' : ''
                }`}
                onClick={() => setSelectedBetType('over_or_under')}
              >
                <span className="bet-type-icon">📊</span>
                <span className="bet-type-name">Over or Under</span>
              </button>

              <button type="button" className="bet-type-option disabled" disabled>
                <span className="bet-type-icon">🎯</span>
                <span className="bet-type-name">Multiple Choice</span>
                <span className="coming-soon">Coming Soon</span>
              </button>

              <button type="button" className="bet-type-option disabled" disabled>
                <span className="bet-type-icon">✅</span>
                <span className="bet-type-name">Yes or No</span>
                <span className="coming-soon">Coming Soon</span>
              </button>
            </div>
          </div>

          {/* Over or Under Form */}
          {selectedBetType === 'over_or_under' && (
            <>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Total points scored in the game"
                  disabled={loading}
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Provide details about the bet..."
                  disabled={loading}
                  rows={4}
                  minLength={10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="targetNumber">Target Number</label>
                <input
                  id="targetNumber"
                  type="number"
                  step="0.01"
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  required
                  placeholder="e.g., 100"
                  disabled={loading}
                />
                <small className="form-hint">Users will bet if the result is over or under this number</small>
              </div>

              <div className="form-group">
                <label htmlFor="bettingWindowEnd">Betting Window Ends</label>
                <input
                  id="bettingWindowEnd"
                  type="datetime-local"
                  value={bettingWindowEnd}
                  onChange={(e) => setBettingWindowEnd(e.target.value)}
                  required
                  min={getMinDateTime()}
                  disabled={loading}
                />
                <small className="form-hint">Users can place bets until this time</small>
              </div>

              <div className="form-group">
                <label htmlFor="group">Group</label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select a group</option>
                  {leaderGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.is_leader ? '(You are leader)' : ''}
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  You can only create bets in groups where you are the leader
                </small>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
