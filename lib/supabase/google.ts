"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogleBrowser(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) return error.message;
  if (data.url) window.location.assign(data.url);
  return null;
}
