# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RSVP (Rapid Serial Visual Presentation) speed reading web app. Users paste article URLs, the app extracts text content, and displays it word-by-word at configurable speeds. Includes reading history with progress tracking.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

```
app/
├── page.tsx              # Home: URL input + reading history
├── read/page.tsx         # Reader page with SpeedReader component
├── api/extract/route.ts  # Server-side article extraction
└── layout.tsx            # Root layout (dark theme)

components/
└── SpeedReader.tsx       # RSVP reader with playback controls

lib/
├── types.ts              # Article, ReadingProgress types
└── storage.ts            # localStorage helpers for history
```

## Key Patterns

**Article Extraction** (`/api/extract`): Server-side fetch + Mozilla Readability parsing. Avoids CORS by proxying through Next.js API route.

**Progress Persistence**: localStorage stores articles and reading progress. Auto-saves on pause/navigate away. Resume from saved position.

**SpeedReader Props**:
- `text`, `title`, `author` - Article content
- `initialIndex`, `initialWpm`, `initialWordsPerFlash` - Resume state
- `onProgressChange` - Callback for saving progress
- `onBack` - Navigation callback

## Keyboard Shortcuts (Reader)
- Space: Play/Pause
- Arrow Left/Right: Skip 10 words
- Arrow Up/Down: Adjust speed ±25 WPM
- R: Restart
- Esc: Back to home
