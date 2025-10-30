import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { level, userId: bodyUserId } = await req.json();
    if (!level) {
      return new Response(
        JSON.stringify({ error: 'level is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Admin client to bypass RLS for matchmaking logic
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Try to resolve user id from auth header; fallback to body param
    let userId = bodyUserId as string | undefined;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUserClient = createClient(supabaseUrl, serviceRoleKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await supabaseUserClient.auth.getUser();
        if (userData?.user?.id) userId = userData.user.id;
      }
    } catch (_) {
      // ignore, will use body userId
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: userId not provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Find earliest waiting match for this level
    const { data: waitingMatches, error: waitingErr } = await supabaseAdmin
      .from('trivia_1v1_matches')
      .select('id, match_code, level, status')
      .eq('status', 'waiting')
      .eq('level', level)
      .order('created_at', { ascending: true })
      .limit(10);

    if (waitingErr) throw waitingErr;

    if (waitingMatches && waitingMatches.length > 0) {
      for (const match of waitingMatches) {
        // Count players for this match
        const { data: players, error: playersErr } = await supabaseAdmin
          .from('trivia_1v1_players')
          .select('id, user_id, player_number')
          .eq('match_id', match.id);
        if (playersErr) continue;

        // Skip if already full or same user
        if (!players || players.length !== 1) continue;
        if (players[0].user_id === userId) continue;

        // Try to join as player 2 (if conflict, try next)
        const { error: insertErr } = await supabaseAdmin
          .from('trivia_1v1_players')
          .insert({ match_id: match.id, user_id: userId, player_number: 2 });
        if (insertErr) continue;

        // Activate match and set first player's turn
        await supabaseAdmin
          .from('trivia_1v1_matches')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
            current_player_id: players[0].user_id,
          })
          .eq('id', match.id);

        return new Response(
          JSON.stringify({ match: { ...match, status: 'active' } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2) No waiting match available: create new waiting match and register player 1
    const matchCode = generateMatchCode();
    const { data: newMatch, error: newMatchErr } = await supabaseAdmin
      .from('trivia_1v1_matches')
      .insert({
        match_code: matchCode,
        level,
        status: 'waiting'
      })
      .select()
      .single();
    if (newMatchErr) throw newMatchErr;

    const { error: playerErr } = await supabaseAdmin
      .from('trivia_1v1_players')
      .insert({ match_id: newMatch.id, user_id: userId, player_number: 1 });
    if (playerErr) throw playerErr;

    return new Response(
      JSON.stringify({ match: newMatch }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('join-random-1v1 error', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMatchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
