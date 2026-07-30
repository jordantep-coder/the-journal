// TFE Journal — create-user Edge Function
// Build order step 11: the "create user ... generates an invite" mentor
// admin flow deferred back in step 2. Runs with the service role key
// (auto-injected by Supabase into every Edge Function's environment — never
// hardcode or ship it to the client) because inviting an auth user requires
// the Auth Admin API, which the browser's publishable key cannot call.
//
// Deploy this from the Supabase dashboard: Edge Functions → Create a
// function named "create-user" → paste this file's contents → Deploy.
// No CLI needed. Before it works end-to-end, set Authentication → URL
// Configuration → Site URL (and Additional Redirect URLs) to wherever the
// app is actually running (e.g. http://localhost:5173 for dev,
// https://journal.thefreedomelitetrading.com in production) — that's what
// the invite email link sends the new user back to.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401)
    }

    // Scoped to the caller's own JWT — used only to find out who's calling.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return json({ error: 'Not authenticated.' }, 401)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerProfile, error: profileError } = await admin
      .from('users')
      .select('role, active')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'mentor' || !callerProfile.active) {
      return json({ error: 'Only active mentors can create accounts.' }, 403)
    }

    const { email, display_name, tier, roadmap_stage } = await req.json()

    if (!email || !display_name) {
      return json({ error: 'Email and name are required.' }, 400)
    }
    if (!['vip', 'alumni'].includes(tier)) {
      return json({ error: 'Invalid tier.' }, 400)
    }

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
    if (inviteError || !inviteData?.user) {
      return json({ error: inviteError?.message || 'Could not send invite.' }, 400)
    }

    const { error: insertError } = await admin.from('users').insert({
      id: inviteData.user.id,
      email,
      display_name,
      role: 'student',
      tier,
      roadmap_stage: roadmap_stage || 'demo',
      active: true,
    })

    if (insertError) {
      // Don't leave an orphaned auth account with no matching profile row —
      // RLS would lock that person out forever with no visible reason.
      await admin.auth.admin.deleteUser(inviteData.user.id)
      return json({ error: insertError.message }, 400)
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500)
  }
})
