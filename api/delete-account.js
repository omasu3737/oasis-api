import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify the JWT token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const userId = user.id;

    // Delete user data from all tables in order (FK constraints)
    await Promise.all([
      supabase.from('direct_messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from('user_questions').delete().eq('target_user_id', userId),
      supabase.from('user_reports').delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`),
    ]);

    await Promise.all([
      supabase.from('friends').delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from('conversation_summaries').delete().eq('user_id', userId),
      supabase.from('group_members').delete().eq('user_id', userId),
    ]);

    await Promise.all([
      supabase.from('persona_data').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('id', userId),
      supabase.from('users').delete().eq('id', userId),
    ]);

    // Finally delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('delete-account error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
