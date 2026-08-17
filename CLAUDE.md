# UAP Report Atlas — project notes

Static site cataloguing officially-documented UAP/UFO incidents. No build step,
no framework, no dependencies to install. Plain HTML/CSS/JS opened directly or
served from GitHub Pages.

**Live:** https://jacobappdevelopment.github.io/uap-report-atlas/
**Repo:** https://github.com/JacobAppDevelopment/uap-report-atlas

## Files

| File | Purpose |
|---|---|
| `index.html` | Single page: header → map + sidebar → Case Imagery collage → About AARO → footer |
| `data.js` | All 71 cases in one `CASES` array. Large file — prefer targeted Edits over full reads |
| `app.js` | Map, markers, filters, search, detail sheet, collage. Vanilla JS, one IIFE |
| `style.css` | Everything except the collage/About sections |
| `about.css` | Collage + About section styling. Loaded by both `index.html` and `about.html` |
| `about.html` | Standalone About page (kept, but the About content is also inline on the main page) |
| `images/` | 43 full-size case images, named `<case-id>.<ext>` |
| `images/thumbs/` | 440px JPEG thumbnails for the collage, always `<case-id>.jpg` |

## Case record shape (`data.js`)

```js
{ id, name, date, lat, lon, location,
  precision: "exact" | "approx",
  status:    "unresolved" | "explained" | "uncorroborated",
  agency, summary, source,
  image: "images/<id>.<ext>" | null,
  imageType: "photo" | "video-still" | "illustration" | null,
  imageCaption, imageCredit }
```

Image filenames always match the case `id`, so a thumbnail path is derivable:
`images/thumbs/<id>.jpg`.

## Conventions that matter

- **Image honesty is the core editorial rule.** Every image is labelled by type
  in the UI. Captions state plainly when a photo is *representative* (a location,
  an aircraft type, an example of the phenomenon) rather than the reported object.
  Never present a rendering or stock photo as evidence. 28 cases carry no image
  because none could be verified — that is deliberate, not an oversight.
- `status` mirrors AARO's own language. "Unresolved" means insufficient data to
  conclude, **not** confirmation of anything anomalous.
- Status colours are shared across map pins, list dots, filter chips and collage
  tags: unresolved = amber, explained = teal, uncorroborated = purple.
- 14 cases are held out of the collage via `GALLERY_EXCLUDE` in `app.js` — the
  contextual/representative images. They still appear in their case files.

## Deploying

```
git add -A && git commit -m "..." && git push
```
GitHub Pages rebuilds in ~30s. Git is not on PATH by default in this
environment — prefix shell commands with:
`$env:Path += ";C:\Program Files\Git\cmd"`

**After any push, the user must hard-refresh (Ctrl+Shift+R).** Pages sends a
~10 min cache header, so a normal refresh serves stale CSS/JS and looks like the
deploy failed. Verify a deploy with `curl` against the live file, not by asking.

## Gotchas already solved — don't re-introduce

- **Map must have a definite height.** `.hero` and `.layout` need real `height`
  values on desktop, not `auto`/`min-height`. With `auto`, the map's `height:100%`
  resolves against the full sidebar list (thousands of px) and the map appears to
  "drop" down the page after load.
- **Wrapping flex containers need `align-content:flex-start`** or spare height
  spreads the rows apart (this hit the status key legend).
- **Ocean/land contrast**: Esri's dark basemap renders ocean RGB(35,34,39) and
  land RGB(63,63,65) — nearly identical. `.leaflet-tile-pane` carries a
  `brightness/contrast` filter to force ocean black and lift land to grey. The
  place-name layer sits in `shadowPane` so labels escape that filter.
- **Local `file://` opening does not load map tiles.** Test on the live URL or
  via a local server, not by double-clicking `index.html`.
- Anchor links scroll via JS, not real `#hash` navigation, so a stale fragment
  can't make the page auto-scroll on load.

## Working preferences

- The user is usage-conscious. Prefer direct edits over spawning subagents;
  research agents are by far the most expensive thing done in this project.
- Verify with small targeted shell checks (grep/curl) rather than re-reading
  large files.
