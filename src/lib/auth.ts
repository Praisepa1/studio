import { createClient } from './supabase/server';

export async function getAuthSession() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return null;
    }
    return session;
  } catch (err) {
    console.error('getAuthSession error:', err);
    return null;
  }
}
