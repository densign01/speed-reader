# Speed Reader

A web app for speed reading articles using RSVP (Rapid Serial Visual Presentation). Paste a URL or text, and read it word-by-word at your preferred speed.

## Features

- **URL extraction** - Paste any article URL and the app extracts the text
- **Paste text** - Directly paste article text for paywalled content
- **Archive fallback** - Automatically tries archive.is for paywalled articles
- **Adjustable speed** - 50-1500 WPM with keyboard shortcuts
- **Reading history** - Saves articles and tracks your progress
- **Resume reading** - Pick up where you left off

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← → | Skip 10 words |
| ↑ ↓ | Adjust speed ±25 WPM |
| R | Restart |
| Esc | Back to home |

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Mozilla Readability (article extraction)

## Deploy

Deploy to Vercel or any Node.js host:

```bash
npm run build
npm start
```
