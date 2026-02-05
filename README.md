# Void-Wall 🌑

A browser-based, real-time shared canvas and chat accessible via secret tokens. Designed with stealth-optimized, low-profile visual signatures.

## Features

- **🎭 Ghost Interface** - Disguised as "Company Portal" internal documentation
- **🔗 URL Obfuscation** - Room codes are Base64-encoded to look like system paths
- **🖼️ Shared Canvas** - Drag and drop links, images, and notes
- **💬 Real-time Chat** - Instant messaging within rooms
- **⏰ Auto-Expiry** - Rooms automatically delete after 24 hours of inactivity
- **🔒 Asset Proxying** - Images fetched through your domain to avoid firewall detection

## Quick Start

### 1. Install Dependencies

```bash
cd void-wall
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Upstash Redis credentials:

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
ROOM_TTL_HOURS=24
```

> **Get free Redis**: Sign up at [Upstash](https://upstash.com/) (10K commands/day free)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Accessing a Room

1. Navigate to the landing page (appears as "Internal Documentation")
2. Click the gear icon to reveal the hidden entry form
3. Enter a room code or click "Create new room"
4. Choose a display name (optional)
5. You're in!

**Direct URL Access:**
```
https://your-domain.com/room/RmFsY29uOTk
```
(Where `RmFsY29uOTk` is the Base64-encoded room code)

### Canvas Features

- **Right-click** anywhere to add elements:
  - 🔗 Links - Opens in new tab
  - 🖼️ Images - Proxied through your domain
  - 📝 Notes - Text annotations
- **Drag** elements to reposition
- **X button** to delete elements

### Chat

- Messages appear in the right sidebar
- URLs are automatically linked
- Last 100 messages are preserved

## Stealth Features

| Feature | Implementation |
|---------|----------------|
| **Tab Title** | "Company Portal \| Settings" |
| **Favicon** | Generic gear icon |
| **UI Design** | Grayscale, system fonts |
| **URL Pattern** | Looks like `/room/[system-file-hash]` |
| **Landing Page** | Fake documentation search |
| **Image Proxy** | External images fetched through `/api/proxy` |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Stealth metadata
│   ├── page.tsx             # Fake documentation landing
│   ├── api/
│   │   ├── room/route.ts    # Room CRUD
│   │   └── proxy/route.ts   # Image proxy
│   └── room/[roomId]/
│       └── page.tsx         # Main wall interface
├── components/
│   ├── Canvas.tsx           # Shared canvas
│   └── Chat.tsx             # Real-time chat
└── lib/
    ├── redis.ts             # Upstash client
    ├── socket.ts            # Socket.io client
    └── stealth.ts           # URL encoding utils
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in project settings
4. Deploy!

The `.vercel.app` subdomain often bypasses basic category filters.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `ROOM_TTL_HOURS` | No | Room expiry time (default: 24) |

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Upstash Redis
- **Styling**: CSS Modules with CSS Variables
- **Real-time**: Socket.io (prepared, not fully integrated)

## Security Notes

- Room codes should be shared securely
- No authentication - anyone with the URL can access
- Data persists only for the configured TTL
- Images are proxied to hide external requests

## License

MIT
