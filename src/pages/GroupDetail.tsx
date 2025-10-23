import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { BetCard } from '../components/BetCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Group, UserProfile } from '../types/index';
import '../styles/pages.css';

interface GroupMemberWithProfile {
  id: string;
  user_id: string;
  joined_at: string;
  profile: UserProfile;
}

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const fetchGroupDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupError) throw groupError;

      setGroup(groupData);

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          id,
          user_id,
          joined_at,
          profile:users_profile!inner(*)
        `
        )
        .eq('group_id', id)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      setMembers(membersData as any);

      // Fetch bets for this group
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(
          `
          *,
          creator:users_profile!creator_id(username),
          group:groups!group_id(name)
        `
        )
        .eq('group_id', id)
        .order('created_at', { ascending: false });

      if (betsError) throw betsError;

      // Get bet statistics for each bet
      const betsWithStats = await Promise.all(
        (betsData || []).map(async (bet) => {
          const { data: stats } = await supabase.rpc('get_bet_stats', {
            p_bet_id: bet.id,
          });

          return {
            ...bet,
            creator_username: (bet.creator as any)?.username || 'Unknown',
            group_name: (bet.group as any)?.name || 'Unknown',
            total_over: stats?.total_over || 0,
            total_under: stats?.total_under || 0,
            participants_count: stats?.total_participants || 0,
          };
        })
      );

      setBets(betsWithStats);
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!id || !user?.id) return;

    if (group?.leader_id === user.id) {
      alert('Group leaders cannot leave their group. Delete the group instead.');
      return;
    }

    if (!confirm('Are you sure you want to leave this group?')) return;

    setLeaving(true);

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      navigate('/groups');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      alert(error.message || 'Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="page-container">
          <div className="empty-state">
            <h3>Group not found</h3>
          </div>
        </div>
      </Layout>
    );
  }

  const isLeader = group.leader_id === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);

  return (
    <Layout>
      <div className="page-container">
        <div className="group-detail-header">
          <div className="group-detail-info">
            <div className="group-detail-icon">
              {group.name === 'Global' ? '🌍' : group.is_private ? '🔒' : '🌐'}
            </div>
            <div>
              <h2>{group.name}</h2>
              <p className="group-detail-description">{group.description || 'No description'}</p>
              <div className="group-detail-badges">
                {isLeader && <span className="badge leader">You are the leader</span>}
                {group.is_private ? (
                  <span className="badge private">Private</span>
                ) : (
                  <span className="badge public">Public</span>
                )}
              </div>
            </div>
          </div>

          {isMember && !isLeader && group.name !== 'Global' && (
            <button onClick={handleLeave} disabled={leaving} className="btn-danger">
              {leaving ? 'Leaving...' : 'Leave Group'}
            </button>
          )}
        </div>

        <div className="section">
          <h3>Members ({members.length})</h3>
          <div className="members-list">
            {members.map((member) => (
              <div key={member.id} className="member-item">
                <div className="member-avatar">
                  {member.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.profile.username}
                    {member.user_id === group.leader_id && (
                      <span className="badge leader-small">Leader</span>
                    )}
                  </div>
                  <div className="member-joined">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Group Bets</h3>
          {bets.length > 0 ? (
            <div className="bets-grid">
              {bets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No bets in this group yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
