export async function handler() {
  return {
    statusCode: 302,
    headers: {
      "Set-Cookie": "session=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax",
      Location: "/",
      "Cache-Control": "no-cache",
    },
  };
}

