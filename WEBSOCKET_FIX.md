# WebSocket Connection Fix

## Problem
Browser is using an old/cached Supabase URL: `wss://zshrglagikuzcvoihzpyt.supabase.co`
But your actual URL is: `https://shrglaqikuzcvoihzpyt.supabase.co`

## Solution

### Step 1: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the Refresh button
3. Select "Empty Cache and Hard Reload"

### Step 2: Clear Application Storage
1. Open DevTools → Application tab
2. Click "Clear site data" (or Clear storage)
3. Check all boxes:
   - Local Storage
   - Session Storage
   - IndexedDB
   - Cookies
4. Click "Clear site data"

### Step 3: Rebuild & Restart
```bash
# Stop the dev server (Ctrl+C)
rm -rf node_modules/.vite
npm run dev
```

### Step 4: Test
1. Open app in incognito/private window
2. Check console - WebSocket errors should be gone

## Why This Happened
- Old Supabase URL was cached in browser storage
- Supabase client reads from cache on initialization
- Build artifacts may contain old URL

## If Still Not Working
Check these files for hardcoded URLs:
- src/lib/supabase.ts
- .env.local (if exists)
- Browser extensions that inject code
