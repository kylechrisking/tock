# Tock

A fast, private to-do list that runs entirely in your browser. No account,
no server, no build step — open `index.html` and start adding tasks. Your
tasks live in your browser's own localStorage and never leave your device.

**Try it:** https://rootlabs.us/apps/tock/ · Source: https://github.com/kylechrisking/tock

## Features

- **Tasks** — add with the button or the Enter key, edit or set a due date
  from the right-click menu, complete, un-complete, delete.
- **Undo** — deleting a task shows a toast with an Undo button for six
  seconds. Nothing disappears by accident.
- **Labels & groups** — flag tasks Important, Work, Personal, Shopping,
  Health or Study; active tasks group under their label automatically.
- **Due dates** — shown in plain language ("Today", "Tomorrow", "Oct 31"),
  overdue tasks turn red, and a sort toggle orders everything by due date.
- **Search** — filter both lists as you type; press `/` anywhere to jump
  to the search box.
- **Progress & streak** — a running count of open tasks, completions today,
  and a 🔥 day streak to keep the chain alive.
- **Stopwatch** — for focused work. It keeps counting across reloads and
  even while the tab was closed, and its buttons actually appear when you
  need them.
- **Dark mode** — remembered between visits.
- **Backups** — export everything to a JSON file and import it on any
  device or browser. Because "it's only localStorage" should never mean
  "it's only on this machine forever".

## Keyboard

| Key | Action |
| --- | ------ |
| `Enter` | Add the task you just typed |
| `/` | Focus the search box |
| `Esc` | Cancel an edit |

## Privacy

There is no backend. Tasks, labels, dates, stats and the stopwatch state
are stored in your browser's localStorage and sent nowhere. The page makes
zero network requests — no fonts, no trackers, nothing.

## Running it

No dependencies and no build step:

```
git clone https://github.com/kylechrisking/tock
open index.html
```

Any static file server works too (`py -m http.server`, `npx serve`, ...).

## Self-hosting / embedding

`index.html`, `script.js` and `styles.css` are the whole app. Copy the
three files anywhere; see the note in the site's `apps/tock/SOURCE.md`
for how rootlabs.us publishes it.

## Looking for more?

Root Labs builds and gives away software like [MyRGB](https://github.com/kylechrisking/MyRGB)
and [Sett](https://github.com/kylechrisking/burrow). See https://rootlabs.us/
