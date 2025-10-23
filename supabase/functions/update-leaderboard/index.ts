import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Call the update_leaderboard database function
    const { data, error } = await supabaseClient.rpc('update_leaderboard');

    if (error) {
      console.error('Error updating leaderboard:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Leaderboard updated:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Leaderboard updated successfully',
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Schedule this function to run once per day at midnight UTC
Deno.cron("update leaderboard", "0 0 * * *", async () => {
  console.log("Running scheduled daily leaderboard update at", new Date().toISOString());

  try {
    // Create Supabase client for cron job
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Call the update_leaderboard database function
    const { data, error } = await supabaseClient.rpc('update_leaderboard');

    if (error) {
      console.error('Cron job error:', error);
    } else {
      console.log('Cron job completed successfully:', data);
    }
  } catch (err) {
    console.error('Cron job unexpected error:', err);
  }
});
