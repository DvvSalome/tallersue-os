import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client for use in Server Components, Route Handlers and
// Server Actions. Runs with the caller's session (RLS enforced), never the
// service role key.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component with no request context;
            // safe to ignore because middleware refreshes the session.
          }
        },
      },
    },
  );
}
