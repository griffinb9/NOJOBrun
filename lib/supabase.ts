import { createClient, SupabaseClient } from '@supabase/supabase-js';

// createClient is deferred until first use so that importing this module
// during Next.js static prerender (where NEXT_PUBLIC_* vars may be absent)
// does not throw at module-evaluation time.

let _instance: SupabaseClient | undefined;

function getInstance(): SupabaseClient {
  if (!_instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing Supabase config. Add NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.',
      );
    }
    _instance = createClient(url, key);
  }
  return _instance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getInstance() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
