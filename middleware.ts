import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let supabaseUrl = "";
  try {
    const parsed = new URL((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim());
    supabaseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    supabaseUrl = "";
  }
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (
      request.nextUrl.pathname.startsWith("/profile") ||
      request.nextUrl.pathname.startsWith("/map") ||
      request.nextUrl.pathname.startsWith("/messages")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("message", "Добавьте ключи Supabase в настройках хостинга");
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((request.nextUrl.pathname.startsWith("/profile") || request.nextUrl.pathname.startsWith("/map") || request.nextUrl.pathname.startsWith("/messages")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/profile/:path*", "/map/:path*", "/messages/:path*", "/auth/callback"],
};
