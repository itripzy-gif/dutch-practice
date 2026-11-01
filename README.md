# Zeg het maar

A tiny phone-friendly web app for practising Dutch pronunciation.

- **Learner** types a word or phrase she wants to hear.
- **Speaker** sees it under "To record", taps Record, listens back, and saves.
- **Learner** finds it under "Ready to hear" and can Play, play it Slow, or Repeat it on a loop.

The list refreshes every 15 seconds and whenever the app is reopened.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The app itself (no build step) |
| `config.js` | Where the Supabase URL and key go |
| `supabase-setup.sql` | Creates the database table and audio storage |

Without keys in `config.js` the app runs in demo mode and saves only on that device.

## Putting it online (about 15 minutes)

1. **GitHub**: create a free account at github.com and a new empty repository (for example `dutch-practice`). The code goes there.
2. **Supabase** (free): at supabase.com create a new project. Then open *SQL Editor → New query*, paste all of `supabase-setup.sql`, and press *Run*. Copy the *Project URL* and the *anon / publishable* key from *Project Settings → API* into `config.js`.
3. **Vercel** (free): at vercel.com sign in with GitHub, choose *Add New → Project*, pick the repository, and press *Deploy* (no settings needed). You get a link like `dutch-practice.vercel.app`.
4. Open that link on both phones. In Safari use *Share → Add to Home Screen* (Android Chrome: *⋮ → Add to Home screen*) so it opens like an app. Each phone picks "learner" or "speaker" the first time.

## Good to know

- The anon key is meant to be public, so it's fine in `config.js`. But there's no login, so anyone who finds the link could add or delete words. Keep the link between the two of you. A simple password can be added later.
- The microphone only works on `https://` links (Vercel gives you that) or on `localhost`.
