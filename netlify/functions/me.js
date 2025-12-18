import { jwtVerify } from "jose";

const SECRET_KEY = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function handler(event) {
  const cookie = event.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Not authenticated" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const { payload } = await jwtVerify(match[1], SECRET_KEY());
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub,
        roles: payload.roles || [],
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid session" }),
      headers: { "Content-Type": "application/json" },
    };
  }
}

