import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { GroupWithMemberCount } from '../types/index';

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all groups the user is a member of
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const memberGroupIds = memberGroups.map((m) => m.group_id);

      // Get groups user is member of OR public groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .or(`id.in.(${memberGroupIds.join(',')}),is_private.eq.false`);

      if (groupsError) throw groupsError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0,
            is_member: memberGroupIds.includes(group.id),
            is_leader: group.leader_id === user.id,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user?.id]);

  return { groups, loading, refetch: fetchGroups };
}
