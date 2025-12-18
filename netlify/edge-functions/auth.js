import { jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const COOKIE_NAME = "session";

export default async (request, context) => {
  const url = new URL(request.url);

  // Allow OAuth callback without forcing login
  if (url.pathname.startsWith("/.netlify/functions/oauth_callback")) {
    return context.next();
  }

  // Allow API endpoints to handle their own auth (both direct and rewritten paths)
  if (
    url.pathname.startsWith("/.netlify/functions/") ||
    url.pathname.startsWith("/api/")
  ) {
    return context.next();
  }

  const SECRET = new TextEncoder().encode(Deno.env.get("SESSION_SECRET"));
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/session=([^;]+)/);
  const cookie = match ? match[1] : null;

  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, SECRET);

      // Domain enforcement - only @reva16.org emails allowed
      if (payload.email?.endsWith("@reva16.org")) {
        return context.next();
      }

      return new Response("Forbidden: Only @reva16.org accounts are allowed", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      // Invalid cookie → force re-auth
      console.log("Invalid session cookie:", err.message);
    }
  }

  // No valid session → redirect to Google OAuth
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");

  if (!GOOGLE_CLIENT_ID) {
    return new Response(
      "Server configuration error: GOOGLE_CLIENT_ID not set",
      {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }

  const redirect = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  redirect.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  redirect.searchParams.set(
    "redirect_uri",
    `${url.origin}/.netlify/functions/oauth_callback`,
  );
  redirect.searchParams.set("response_type", "code");
  redirect.searchParams.set("scope", "openid email profile");
  redirect.searchParams.set("hd", "reva16.org"); // Hint to show only reva16.org accounts
  redirect.searchParams.set("prompt", "select_account");

  return Response.redirect(redirect.toString(), 302);
};

export const config = { path: "/*" };
