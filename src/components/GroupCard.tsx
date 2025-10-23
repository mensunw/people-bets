import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupWithMemberCount } from '../types/index';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GroupCardProps {
  group: GroupWithMemberCount;
  onUpdate: () => void;
}

export function GroupCard({ group, onUpdate }: GroupCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setJoining(true);

    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user?.id,
      });

      if (error) throw error;

      onUpdate();
    } catch (error: any) {
      console.error('Error joining group:', error);
      alert(error.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const handleClick = () => {
    navigate(`/groups/${group.id}`);
  };

  return (
    <div className="group-card" onClick={handleClick}>
      <div className="group-card-header">
        <div className="group-icon">
          {group.name === 'Global' ? '🌍' : group.is_private ? '🔒' : '🌐'}
        </div>
        <div className="group-badges">
          {group.is_leader && <span className="badge leader">Leader</span>}
          {!group.is_private && <span className="badge public">Public</span>}
        </div>
      </div>

      <h3 className="group-name">{group.name}</h3>
      <p className="group-description">{group.description || 'No description'}</p>

      <div className="group-footer">
        <div className="group-members">
          <span className="member-icon">👥</span>
          <span>{group.member_count} members</span>
        </div>

        {!group.is_member && !group.is_private && (
          <button onClick={handleJoin} disabled={joining} className="btn-join">
            {joining ? 'Joining...' : 'Join'}
          </button>
        )}

        {group.is_member && <span className="badge joined">Joined</span>}
      </div>
    </div>
  );
}
