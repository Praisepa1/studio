import { createClient } from './supabase/server';

export async function getAuthSession() {
  try {
    const supabase = await createClient();
    
    // Use getUser() to securely authenticate the user against Supabase Auth server,
    // rather than getSession() which relies solely on local storage/cookies.
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Return a session-like object for backwards compatibility with existing route guards
    return {
      user,
    };
  } catch (err) {
    console.error('getAuthSession error:', err);
    return null;
  }
}
