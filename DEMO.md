# Demo welcomes

How every app greets a visitor who arrives from the portfolio: one overlay, one kind of demo,
one kind of walk-through, the same in every project. A visitor who has seen one should know
exactly how the next one works.

The parts:

1. **The choice**: an overlay with two ways in, *See the demo* or *Start fresh*.
2. **The demo**: the app filled with sample data, as if someone had used it for a few weeks.
3. **The walk-through**: 6–8 steps round the demo, each lighting up one part of the app.
4. **The banner**: a small pill while the demo is in use, with *Start fresh*.

All four come from one file, `tools/demo-welcome.js` in this repo (the master). Each app keeps
a copy and supplies only what's its own: the words, the sample, how to clear it, and the
steps. Look and behaviour live in the file, never in an app.

Done so far: **Nihongo Quest**, **Hanzi Quest**, **Cantonese Quest**, **Writers Blocks** and
**Photobook Studio** (all four); **Trip Board** and **UI Field Guide** (choice, demo and
walk-through; their samples mark themselves, so no banner).

## When it shows

- Only when the page was opened from the portfolio (**Open the app** adds `?from=portfolio`)
  **and** the visitor has nothing saved in the app yet.
- Never for someone who came another way, or who already has their own data. Jen, opening her
  own apps, never sees it.
- The parameter is taken out of the address at once, so a reload or a shared link doesn't ask
  again.
- Esc or a click on *Start fresh* closes it; the app is then exactly as a new user finds it.

## The choice (the overlay)

The overlay's frame is fixed: *From Jen's portfolio*, the app's name, one line of lead-in, two
buttons, and a fine-print line. The app supplies:

| field | limit | what it says |
|---|---|---|
| `name` | as on the portfolio | the app's name, exactly as its card shows it |
| `accent` | `#rrggbb` | the app's own main colour (the same as its `overview.json`) |
| `demo` | 100 chars | what's in the demo, concretely: who this is and what's open. "A learner a few weeks in: all the kana, half the words, the games and the street open." |
| `fresh` | 80 chars | what a new user starts with, in the app's own terms. "An empty board. Start a trip and it asks you what it needs." |

Both lines are fragments or one short sentence, in the voice below. Name real things from the
app (*the kana*, *the board*, *The Salt Year*), never "sample data" or "a demo account".

## The demo (sample data)

A demo is someone a few weeks into using the app, so that:

- **Nothing is locked.** Anything that opens with progress (katakana after the hiragana check,
  games after enough words, a place after half its words) is open.
- **There's no setup.** Intros, onboarding questions and first-run guides are marked as seen.
  The app's own first-run tour sits the demo out (keep it in Help, and leave the visitor's own
  setting alone, so their first real project still gets it: see Writers Blocks).
- **It looks lived in.** Believable names and numbers, some things finished and some half
  done, history spread over the last few weeks. Dates are relative to today, so the demo never
  goes stale.
- **It's made up.** Never Jen's own data, never a real person's.

Where the sample comes from, in order of preference:

1. **The app's own sample**, if it has one (Writers Blocks' *Explore a sample*, Trip Board's
   sample trip). The demo just opens it.
2. **The learner or data its screenshots already use** (`overview/shots.json`, a trailer's
   seed). Nihongo Quest's demo is its trailer's learner, plus katakana open and the guide read.
3. **New made-up data**, written into the app's storage the way its own load function expects.

`isEmpty` says whether the visitor has nothing yet; `loadDemo` fills the app (it may reload the
page); `clear` takes the sample away again, leaving a true new user. If the sample can be
closed or deleted by the app's own means, give `stillDemo` so the banner goes with it.

## The walk-through

**6–8 steps.** Each one may switch the app to a screen (`go`), lights up one part of it (`el`),
and says one thing about it. Back, Next, *Skip the tour*, the arrow keys and Esc work on every
step. It starts as soon as the demo has loaded, and the banner waits until it's over.

The shape is the same in every app:

1. **Home first**: the screen the app opens on, and what it's for (*Today*, *Your desk*).
2. **The defining features, 3–5 steps**: the same ones as the project's overview
   (`overview.json` features), in the same order, each on the screen where it lives.
3. **Where everything lives**: the app's navigation (a top bar, a side list, a menu button on
   a phone), so the visitor can find the rest alone.
4. **"Over to you"** (no `el`: a card in the middle): everything works, what to try first, and
   *Start fresh is at the bottom left* (or where the app's own sample marker is).

| field | limit | |
|---|---|---|
| `title` | 28 chars | 2–5 words, sentence case. May lead with the app's own label for the screen (`今日 Today`, `遊ぶ Play, earn, collect`) |
| `text` | 160 chars | one or two sentences: what it does and why it matters. One concrete detail from the demo is good ("There are 220 coins here to spend.") |
| `el` | | a CSS selector, or a list tried in order, the first one on screen wins. Give a phone fallback when the part moves (`[".top-nav", "#burger"]`) |
| `go` | | gets the app to the right screen with its own functions (`go("games")`, `goStage("draft")`). Never clicks buttons |

**What to light up.** One meaningful card or section, not the whole page: the capsule
machine, not the Games tab; the direction box, not the editor. Where a view is the point (a
map, a board), the view's own area is fine. Something on screen without scrolling the page
sideways, and visible at phone width.

**Where the card goes** is the file's business: beside the lit part on a desktop; along the
bottom on a phone, or along the top when the lit part is down there.

## The banner

A small pill at the bottom left: *You're looking at a demo · Start fresh* (*Demo · Start fresh*
on a phone). *Start fresh* asks once, then calls `clear`. Use `bannerAt: "top"` only if the
app has a bar along the bottom-left; check it doesn't cover the app's own buttons at phone
width. Leave it out (`banner: false`) only when the app's sample already says it's a sample
and can be removed from there (Trip Board).

## Voice

The same as the overviews (`jens_launchpad/OVERVIEW.md`):

- Write for the visitor: "you", present tense.
- Plain words. No hype ("powerful", "seamless", "effortless"), no emoji, no exclamation marks.
- Concrete beats clever. "Drag cards to restructure it" beats "reshape your story".
- Every line is true of the app as shipped, and of the demo as loaded. If a number is in the
  text, it's in the demo.
- Name things as the app names them: its tabs, buttons and Japanese labels.

## Adding it to an app (instructions for Claude)

1. **Read the app**: its README, its storage (what key, what shape), how it boots, how it
   switches screens, and any first-run guide or tour it has.
2. **Find the sample** (above), and write `isEmpty`, `loadDemo` and `clear`. Check that
   `clear` really leaves a new user (reload and look).
3. **Copy** `tools/demo-welcome.js` from this repo into the app unchanged. Load it before the
   app's own script, or in `<head>`; call `DemoWelcome.init({...})` after the app has loaded
   its data. Never edit the copy: change the master here, then copy it to every app.
4. **Write the words**: `demo`, `fresh`, then the steps, within the limits. Take the features
   and their wording from the app's `overview.json`, so the overview and the tour agree.
5. **Respect the app's shipping rules**: add the file to its offline cache list and bump the
   cache version (Writers Blocks' `sw.js`), stamp versions (Nihongo Quest:
   `node tools/version.mjs patch`), add a changelog entry if it keeps one, and keep tests that
   slice its HTML or scripts working (Trip Board's tests read the last `</script>`, so the
   setup goes inside its main script).
6. **Test in a clean browser** (a private window, or clear the site's storage, offline cache
   and service worker; a tab can hold old scripts in memory, so use a new one):
   - `?from=portfolio` with nothing saved: the overlay shows, and the address loses the
     parameter
   - *See the demo*: the demo loads, nothing is locked, no setup or first-run tour appears
   - every step, at desktop and phone width, in light and dark: the right part lights up, the
     card doesn't cover it, the text is true. On a phone, check pages that are wider than the
     screen too (Trip Board's tabs): the file places everything against what's on screen, not
     the page, so the overlay, card and banner should still sit inside it
   - the banner after the tour; *Start fresh* from it leaves a new user
   - *Start fresh* from the overlay, and Esc, leave the app untouched
   - a direct visit (no parameter) and a visitor with their own data: no overlay
   - the app's own tests still pass
7. **Ship** the app first, then anything on the portfolio that depends on it. Note the app in
   *Done so far* above.

## The examples

- **Nihongo Quest** (`js/demo.js`): the fullest one. A sample built from its trailer's
  learner, a demo that reloads the page, eight steps across five tabs, a phone fallback for
  the navigation step.
- **Writers Blocks** (top of `js/app.js`): an in-memory sample, the app's own first-run tour
  set aside for the demo only, eight steps across its stages and views.
- **Trip Board** (end of the main script in `Trip Board.html`): its own sample trip, no banner
  because the sample marks itself, and eight steps across the calendar, Discover and Coverage.
- **Hanzi Quest** and **Cantonese Quest** (`js/demo.js`): the learner from each app's
  `overview/shots.json`, wrapped in a function, and seven steps that follow its overview.
- **UI Field Guide** (last script in `index.html`): an app that's never empty. The demo loads
  nothing and clears nothing; it's the walk round the library and the example mockup.
- **Photobook Studio** (`src/web/demo/` in the web build): new made-up data, illustrated photos
  that go through the app's real import (their EXIF dates moved to three weeks ago when the demo
  loads), a demo that reloads the page, eight steps across the home page and the editor.
