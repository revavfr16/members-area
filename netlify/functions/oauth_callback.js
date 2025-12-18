import { SignJWT } from "jose";

const COOKIE_NAME = "session";

// Special users with elevated roles
// TODO: Move to database when members area has user management
const USER_ROLES = {
  "dzager@reva16.org": ["admin", "approver", "disburser"],
};

export async function handler(event) {
  const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
  const url = new URL(event.rawUrl);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return {
      statusCode: 400,
      body: `OAuth error: ${error}`,
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing authorization code",
    };
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/.netlify/functions/oauth_callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return {
        statusCode: 400,
        body: `Token exchange failed: ${tokenData.error_description || tokenData.error}`,
      };
    }

    // Get user info
    const profileRes = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
    );
    const profile = await profileRes.json();

    if (profile.error) {
      console.error("Profile fetch error:", profile);
      return {
        statusCode: 400,
        body: "Failed to fetch user profile",
      };
    }

    // Enforce @reva16.org domain
    if (!profile.email?.endsWith("@reva16.org")) {
      return {
        statusCode: 403,
        headers: {
          "Content-Type": "text/html",
        },
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
              <div style="text-align: center; color: #eee; padding: 2rem;">
                <h1 style="color: #e94560;">Access Denied</h1>
                <p>Only @reva16.org accounts are allowed.</p>
                <p style="color: #666;">You signed in as: ${profile.email}</p>
                <a href="/api/logout" style="color: #e94560;">Try a different account</a>
              </div>
            </body>
          </html>
        `,
      };
    }

    // Get user roles
    const userRoles = USER_ROLES[profile.email] || [];

    // Create signed session cookie (JWT)
    const session = await new SignJWT({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      sub: profile.id,
      roles: userRoles,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(SECRET);

    return {
      statusCode: 302,
      headers: {
        "Set-Cookie": `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
        Location: "/",
        "Cache-Control": "no-cache",
      },
    };
  } catch (err) {
    console.error("OAuth callback error:", err);
    return {
      statusCode: 500,
      body: `Authentication failed: ${err.message}`,
    };
  }
}
