import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/modal.css';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess: () => void;
}

interface UserProfile {
  id: string;
  username: string;
}

export function InviteMembersModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSuccess,
}: InviteMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, isOpen]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      // Get users who are not already in the group
      const { data: existingMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const existingMemberIds = existingMembers?.map((m) => m.user_id) || [];

      const { data, error } = await supabase
        .from('users_profile')
        .select('id, username')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing members
      const availableUsers = (data || []).filter(
        (user) => !existingMemberIds.includes(user.id)
      );

      setUsers(availableUsers);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleInvite = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select at least one user');
      return;
    }

    setInviting(true);
    setError('');

    try {
      const membersToAdd = Array.from(selectedUsers).map((userId) => ({
        group_id: groupId,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from('group_members')
        .insert(membersToAdd);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setSearchQuery('');
      setSelectedUsers(new Set());
      setUsers([]);
    } catch (err: any) {
      console.error('Error inviting members:', err);
      setError(err.message || 'Failed to invite members');
    } finally {
      setInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Members to {groupName}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="search">Search Users</label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter username..."
              autoComplete="off"
            />
            <small className="form-hint">Type at least 2 characters to search</small>
          </div>

          <div className="user-search-results">
          {loading && <div className="loading-spinner">Searching...</div>}

          {!loading && users.length === 0 && searchQuery.length >= 2 && (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="user-list">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`user-item ${selectedUsers.has(user.id) ? 'selected' : ''}`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                  <div className="user-name">{user.username}</div>
                  {selectedUsers.has(user.id) && <span className="check-icon">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

          {selectedUsers.size > 0 && (
            <div className="selected-count">
              {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={inviting}>
            Cancel
          </button>
          <button
            onClick={handleInvite}
            className="btn-primary"
            disabled={inviting || selectedUsers.size === 0}
          >
            {inviting ? 'Inviting...' : `Invite ${selectedUsers.size || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
