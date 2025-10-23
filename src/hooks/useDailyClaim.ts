import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function useDailyClaim() {
  const { user } = useAuth();
  const [canClaim, setCanClaim] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const checkClaimEligibility = () => {
      if (!user?.profile?.last_claim_date) {
        setCanClaim(true);
        setTimeUntilNextClaim('');
        return;
      }

      const lastClaim = new Date(user.profile.last_claim_date);
      const now = new Date();
      const nextClaimDate = new Date(lastClaim);
      nextClaimDate.setDate(nextClaimDate.getDate() + 1);
      nextClaimDate.setHours(0, 0, 0, 0);

      if (now >= nextClaimDate) {
        setCanClaim(true);
        setTimeUntilNextClaim('');
      } else {
        setCanClaim(false);
        const diff = nextClaimDate.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeUntilNextClaim(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    checkClaimEligibility();
    const interval = setInterval(checkClaimEligibility, 1000);

    return () => clearInterval(interval);
  }, [user?.profile?.last_claim_date]);

  const claimCurrency = async () => {
    if (!canClaim || claiming) return;

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_daily_currency');

      if (error) throw error;

      if (data?.success) {
        // Refresh user profile to update balance and last_claim_date
        const { data: profile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user?.id)
          .single();

        // Force a re-render by updating the auth context
        window.location.reload();

        return { success: true, amount: data.amount };
      } else {
        return { success: false, message: data?.message || 'Failed to claim' };
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      return { success: false, message: error.message };
    } finally {
      setClaiming(false);
    }
  };

  return {
    canClaim,
    timeUntilNextClaim,
    claiming,
    claimCurrency,
  };
}
