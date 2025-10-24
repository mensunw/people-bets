import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserBettingStats } from '../types';

interface UseUserBettingStatsOptions {
  userId: string | null;
  timeRange?: number; // days
  enabled?: boolean;
}

interface UseUserBettingStatsReturn {
  stats: UserBettingStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserBettingStats({
  userId,
  timeRange = 30,
  enabled = true,
}: UseUserBettingStatsOptions): UseUserBettingStatsReturn {
  const [stats, setStats] = useState<UserBettingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!userId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create cache key
      const cacheKey = `user-stats-${userId}-${timeRange}`;
      const cacheETagKey = `${cacheKey}-etag`;

      // Get cached ETag
      const cachedETag = localStorage.getItem(cacheETagKey);

      // Prepare headers
      const headers: HeadersInit = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Add If-None-Match header if we have a cached ETag
      if (cachedETag) {
        headers['If-None-Match'] = cachedETag;
      }

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-stats?user_id=${userId}&range=${timeRange}`,
        {
          method: 'GET',
          headers,
        }
      );

      // Handle 304 Not Modified - data hasn't changed
      if (response.status === 304) {
        console.log('📊 Using cached user stats (304 Not Modified)');
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          setStats(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user stats');
      }

      // Parse fresh data
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user stats');
      }

      // Store new ETag
      const newETag = response.headers.get('etag');
      if (newETag) {
        localStorage.setItem(cacheETagKey, newETag);
      }

      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(result.data));

      // Update state
      setStats(result.data);
      console.log('📊 Fresh user stats fetched from edge function');
    } catch (err: any) {
      console.error('Error fetching user stats:', err);
      setError(err.message || 'Failed to fetch user stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId, timeRange, enabled]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
