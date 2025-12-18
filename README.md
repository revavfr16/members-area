# REVA16 Members Portal

A secure members-only site for REVA16, protected by Google OAuth and restricted to `@reva16.org` accounts.

## Features

- 🔒 **Domain-restricted access** - Only `@reva16.org` Google accounts can access
- ⚡ **Edge-level authentication** - Auth happens at the CDN edge, before your app loads
- 🍪 **Secure sessions** - JWT-signed cookies with 8-hour expiration
- 🚫 **No database required** - Stateless authentication
- 🎨 **Modern React UI** - Built with React 19 and Tailwind CSS

## Architecture

```
User → members.reva16.org
 ↓
Netlify Edge Function: is there a session cookie?
   → NO → redirect to Google OAuth
   → YES → verify JWT signature + check email domain
       → if endsWith('@reva16.org') → allow
       → else → deny (403)
 ↓
React App Loads
 ↓
React calls /.netlify/functions/me to get user info
```

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **OAuth consent screen**
   - Choose "External" user type
   - Fill in app name, support email, etc.
   - Add scopes: `email`, `profile`, `openid`
4. Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose "Web application"
   - Add authorized redirect URI: `https://members.reva16.org/.netlify/functions/oauth_callback`
   - (For local dev, also add: `http://localhost:8888/.netlify/functions/oauth_callback`)
5. Copy the **Client ID** and **Client Secret**

### 2. Environment Variables

Set these in Netlify (Site settings → Environment variables):

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from Google Cloud Console |
| `SESSION_SECRET` | Random 32+ character string for JWT signing |

Generate a session secret:
```bash
openssl rand -base64 32
```

### 3. Local Development

```bash
# Use Node.js 22 (required - netlify-cli doesn't support Node 23+ yet)
nvm use 22  # or install Node 22 if you don't have it

# Install dependencies
npm install

# Create a .env file with your credentials
cp .env.example .env
# Edit .env with your actual values

# Run the dev server (uses netlify dev under the hood)
npm run dev
```

> **Note:** `npm run dev` uses `netlify dev` which runs the edge functions locally. If you just want to run the Vite dev server without auth, use `npm run dev:vite`.

### 4. Deploy to Netlify

1. Connect your repo to Netlify
2. Set the environment variables in Netlify dashboard
3. Deploy!

## Project Structure

```
├── netlify/
│   ├── edge-functions/
│   │   └── auth.js          # Protects entire site at the edge
│   └── functions/
│       ├── oauth_callback.js # Handles Google OAuth callback
│       ├── me.js             # Returns current user info
│       └── logout.js         # Clears session cookie
├── src/
│   ├── App.tsx              # Main app component
│   ├── hooks/
│   │   └── useUser.ts       # Hook to get current user
│   ├── index.css            # Tailwind styles
│   └── main.tsx             # React entry point
├── netlify.toml             # Netlify configuration
└── package.json
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.netlify/functions/me` | GET | Returns current user info (email, name, picture) |
| `/.netlify/functions/logout` | GET | Clears session and redirects to home |
| `/.netlify/functions/oauth_callback` | GET | OAuth callback (internal use) |

## Security

- **Edge-level enforcement**: Auth is checked at the CDN edge before any content is served
- **Domain restriction**: Only `@reva16.org` emails are allowed
- **Signed JWTs**: Session cookies are cryptographically signed and can't be tampered with
- **HttpOnly cookies**: Session cookies can't be accessed by JavaScript
- **8-hour expiration**: Sessions automatically expire

## License

MIT
