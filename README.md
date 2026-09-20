# NexusPaste

The single-file notepad, as a website.

## What changed from the file you have

Two things, both because a `file://` page and a hosted page are not the
same environment:

1. **The manifest is a real file** (`manifest.json`) instead of a
   `data:` URI. Same contents — it was read out of the old one — but
   Android needs a real manifest before it will offer "Install app".

2. **The service worker is a real file** (`sw.js`). It used to be a
   string turned into a `blob:` URL and registered from inside the page.
   Chrome allows that; Firefox and Safari refuse it, so offline was
   working for some visitors and silently failing for the rest.

3. **It now saves when the page is hidden** (`visibilitychange`) and
   when it is unloaded (`pagehide`). It already saved 500 ms after you
   stopped typing — but on a phone you never "close" anything, you swipe
   away, and the browser can reclaim the page without warning. Those two
   events are the ones that are actually delivered when that happens.
   `beforeunload` is deliberately not used: it is ignored on iOS and
   unreliable on Android, which is exactly where this matters.

4. **A failed save now says so.** `saveEditorDraft` was wrapped in
   `catch {}` — an empty catch. When storage filled up it stopped saving
   and told you nothing, so you kept typing into something that had
   quietly given up. It now shows a warning once.

Nothing else was touched. The notepad itself is your file.

## The storage ceiling, which you will hit

Pasted images are stored as base64 text inside the note, and
`localStorage` holds about **5 MB total**. Two photos from a phone
camera can exceed that on their own. When it happens every further save
fails — silently, before this change.

If you paste images regularly, the real fix is moving storage to
IndexedDB, which holds hundreds of megabytes instead of five. That is a
bigger change than these, and worth doing deliberately rather than
bundled in with a bug fix. Until then: export a backup regularly, and
take the warning seriously when it appears.

## Deploying it

It is three static files. Any host will do; Vercel takes about five
minutes:

1. Put these files in a folder, `git init`, push to a new GitHub repo
2. Vercel → **Add New Project** → import that repo
3. Framework preset: **Other**. No build command, no output directory —
   it is already built
4. **Deploy**

For a custom address, add the domain in Vercel and point a CNAME at it
from Cloudflare, the same way xstream.wittyhub.co works.

## Moving your existing notes

**Do this before you start using the hosted version.**

Your notes live in your browser's storage, and that storage is tied to
the address the page was opened from. Notes saved from a file on your
disk are invisible to the same page served from a URL — not lost, just
in a different box that the new one cannot see.

1. Open your local copy
2. **Export** → saves `nexuspaste-backup.json`
3. Open the hosted version
4. **Import** → pick that file

## After you change index.html

Bump `CACHE` in `sw.js` (`nexuspaste-v2` → `v3`). Without that, anybody
who has visited before keeps being served the old page out of their own
cache.

## Worth knowing

Notes are stored per-browser, on each visitor's own device. There is no
account and no server holding anything, so nothing anybody writes ever
reaches you — which also means there is no syncing between their phone
and their laptop, and clearing site data wipes their notes. Fine for a
scratchpad. Say so on the page if people start relying on it.

## Brought over from the desktop build

Only the parts a browser can actually do.

**Copy a pasted image back out.** Click any image in the editor and a
*Copy image* button appears; it writes a real PNG to the system
clipboard, pasteable into anything. This was the first gap the desktop
version was written to close. Firefox still has not implemented writing
images to the clipboard and says so rather than failing quietly.

**An encrypted vault.** The 🔒 button encrypts the current note with a
passphrase and clears the editor; pressing it again asks for the
passphrase and puts the note back. AES-256-GCM, with the key derived by
PBKDF2-SHA256 at 310,000 iterations — the desktop build uses Argon2,
which a browser cannot do without shipping a WebAssembly blob, so this
is the strongest thing the platform provides natively. Weaker than
Argon2 against purpose-built hardware; far beyond guessing a decent
passphrase.

**There is no recovery.** Nothing in this app can read the vault without
the passphrase. That is the point, and it also means forgetting it loses
the contents for good.

**A nudge when you paste a key.** Pasting something shaped like an API
key, a private key block or `password: …` shows a one-line reminder that
🔒 exists. It never blocks anything — it is your note.

### Floating over other apps

The ⧉ button opens the editor in a **Document Picture-in-Picture**
window: a real OS window that sits above every other application, on
desktop Chrome and Edge. No install, no permission prompt, no extension.
It is the closest a web page gets to the native build.

It is not the same thing. It works on desktop Chromium only — not
Firefox, not Safari, and not on a phone, where floating over other apps
needs an overlay permission only an installed app can hold. The button
says so rather than doing nothing.

The editor node is *moved* into that window, not copied, so autosave,
paste handling and the image copy button move with it. Closing the
window saves and puts the editor back where it was.

### On a phone

A web page **cannot** float over other apps, on Android or iOS, and no
permission changes that. Android's "display over other apps"
(`SYSTEM_ALERT_WINDOW`) is real but only an installed native app can
hold it — that is what `mobile/android-overlay/OverlayService.kt` in the
desktop project is for. iOS has no equivalent even for native apps.

What a phone *can* do is put NexusPaste in the share sheet. Install it
to the home screen, and it then appears wherever you tap **Share** —
selected text in WhatsApp, a link in Chrome, a quote from a PDF. Two
taps and the thought is in your notes, from any app, without losing your
place. That was the reason for wanting a floating widget; this answers
it a different way.

Android Chrome only. iOS Safari has never implemented `share_target`, so
on an iPhone this does nothing and the native share extension is the
only route.

Long-pressing the home screen icon also offers **New note**.

### What did not come over, and cannot

The global hotkey, the tray icon, hiding from the taskbar, LAN sync over
mDNS, silent screen capture. And floating on a **phone** — Android's
"display over other apps" is a real permission, but only an installed
app can hold it, which is what `mobile/android-overlay/OverlayService.kt`
in the desktop project is for.

If you need the hotkey and the tray, build the Tauri project. This is
the version that goes everywhere instead, and now floats on desktop.

### Already there, so nothing was added

Searching your clips (the box above the history list), voice dictation,
OCR, QR, dictionary, translation and exchange rates were all in your
file already.
