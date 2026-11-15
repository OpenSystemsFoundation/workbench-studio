# Workbench Studio

A groovebox with the theory attached. Pick a drum pattern, write a chord progression, put
a bassline under it — all on one clock — and explore the keys, scales and harmony behind
what you're building, with live bass, guitar and piano lighting up the notes you hear.

Six tabs: **Circle** explores, **Drums** / **Chords** / **Bass** build over one shared
transport, **Metronome** practises, and **Learn** teaches. The split is deliberate — the
tool tabs apply the theory and stay uncluttered, while every piece of explanation, every
teaching palette and every drill lives behind Learn. See `docs/REDESIGN.md`.

This is a single **adaptive** app that presents a two-column desktop workspace (content +
side instrument panel) and a stacked mobile experience (thin top bar + a fixed transport /
instrument dock and bottom tab bar) from one component tree. Both layouts have full
feature parity.

## Tech stack

- **[Svelte 5](https://svelte.dev)** (runes) + **[Vite 6](https://vite.dev)**
- **TypeScript** throughout
- **[Vitest](https://vitest.dev)** for engine unit tests
- **[Playwright](https://playwright.dev)** for end-to-end tests (desktop + mobile viewports)
- **Web Audio API** sound engine — modelled instruments rendered on the device; no audio
  assets and no audio libraries, everything is generated (see [The sound](#the-sound))
- **Installable PWA** with a precached app shell for complete offline use after the first load

## Architecture

```
src/
  lib/
    engine/            Pure, framework-agnostic music theory (unit-tested)
      constants.ts     Note names, scales, chord tables, functional-harmony colours
      theory.ts        Spelling, diatonic generation, substitutions, voicings, inversions
      genres.ts        THE shared genre taxonomy: 8 families, 31 genres. Drums,
                       basslines and progressions all shelve off this one list,
                       so a genre means the same thing in every tab.
      data.ts          Progression library (122 across the 31 genres), the
                       pattern library, the Learn-mode jazz curriculum
      fretpatterns.ts  Fretboard diagram library (scale boxes, chord grips)
      bass.ts          Degree resolution, walking tricks, the bassline index,
                       and one bar of a line resolved into actual notes
      basslines/       The bassline library: 119 grooves across 31 genres
                       (rockpop, funksoul, hiphop, house, breaks, hard, jazz, world)
      kit.ts           The instrument table: one entry per drum voice, carrying
                       its row metadata AND its synthesis recipe (noise/tone/metal
                       layers). Add an instrument by adding an entry — the id
                       union, the grid shape and the audio engine follow.
      drums.ts         Drum genres, grid composition, swing, rhythm concepts
      patterns/        The groove library: 132 layered patterns across 31 genres
                       (rockpop, funksoul, hiphop, house, techno, breaks, hard,
                       jazz, world)
      playhead.ts      Which 16th of the bar the ear is hearing: bars are queued
                       and promoted when they reach the speakers, so drums and
                       bass both track what is sounding, not what was scheduled
      ear.ts           Ear-training question generator
      reading.ts       Sight-reading drills: staff geometry, key signatures, targets
    view/              Pure view-model builders (state in → render props out)
      index.ts         computeView(store): assembles the full view-model
      types.ts         View-model shapes (chips, wedges, fret rows, piano keys)
      circle.ts        Circle-of-fifths wheel geometry and colouring
      instruments.ts   Fretboard + piano lighting and the jazz finger overlay
      chords.ts        Progression strip, diatonic/colour palettes, chord inspector
      bass.ts          The line, the groove shelf, the annotated library cards,
                       and the count / note / change rows tracked under the line
      patterns.ts      Pattern library, chord shapes, fret diagrams
      drums.ts         Groovebox grid, genre → pattern picker, layer stepper
      picker.ts        Shelf/chip builders shared by all the genre pickers
      learn.ts         Jazz curriculum, the jazz/classical palettes, rhythm
                       concepts, bassline moves, song-structure timelines
      practice.ts      Ear-training and sight-reading views
      midi.ts          The MIDI bar button, device status and the pad map rows
    metronome/         Practice metronome (ported from Metrognome): look-ahead
                       click engine, tempo/mute automation, mic tempo detection,
                       practice-session history, and its own runes sub-store
    midi/              MIDI out: the band played to hardware (see below)
      map.ts           Pure address book — group/pad note numbers, the drum map,
                       per-part channel and transpose, settings sanitising
      out.ts           The wire: Web MIDI ports, timestamped notes, clock, panic
      store.svelte.ts  Connection + mapping state, and the send methods the
                       transport calls on the bar line
    synth/             The instruments, as pure DSP with no Web Audio in it (unit-tested)
      keys.ts          Electric piano: a tine swinging past a pickup
      strings.ts       Plucked string — the bass and the guitar — as a sum of modes
      drumkit.ts       Renders a kit recipe (engine/kit.ts) into one buffer per strike
      room.ts          The stereo room reverb's impulse response
      bank.ts          Renders each sound once, in idle time, and keeps it as a buffer
    audio.ts           The sound engine: plays the bank through a small mixing desk
                       (isolated from state)
    learn/
      catalog.ts       The Learn library's catalogue: ONE tree of shelves, books
                       and pages (unit-tested). The tree rail, breadcrumbs, index
                       pages, pager, search and command palette all read it, so
                       a new lesson is one entry here plus its page component.
    master.ts          The one output bus and its safety clamp — band, click and drone
    store.svelte.ts    Svelte 5 runes store: $state + actions + view = $derived(computeView)
    context.ts         provideStore()/useStore() context helpers
    components/        StudioBar (brand + transport + key), KeyPicker, GenrePicker,
                       CircleMode, DrumsMode, ChordsMode, BassMode, MetronomeMode,
                       LearnMode (the library's reading room), EarMode,
                       ReadingMode, Staff, Instruments, Fretboard, FretDiagram,
                       Piano, MidiPanel
      ui/              Small presentational parts with no knowledge of the store:
                       Tag, SectionHead, FieldLabel, Callout, Card, Chip,
                       PlayButton, Legend. Scoped styles, tokens from app.css.
      parts/           Widgets used at two altitudes — bare in a tool tab, wrapped
                       in teaching copy in Learn (ChordInspector) — and ChordChip,
                       the one chip every lesson and palette draws a chord with
      learn/           The library furniture — LibraryTree, LibraryCrumbs,
                       LibraryIndex, LibraryPager — and pages.ts, the registry
                       that maps a catalogue page kind to its component
        pages/         One component per kind of lesson
  App.svelte           Adaptive shell (desktop tabs + side panel / mobile dock + tab bar)
  main.ts              Mount entry
```

The **engine** is pure functions with no Svelte or DOM dependency, so the harmony logic is
independently testable. The **store** holds all reactive state and the actions; the
**view** layer is a set of pure functions that turn that state into a single `$derived`
view-model (`store.view`) — components read `store.view.*` and call `store.<action>()`.
See `docs/IMPROVEMENTS.md` for the prioritized roadmap of proposed enhancements.

## The sound

There are no samples to download and no audio library: every instrument is a small physical
model, rendered on the device.

- **Keys** are an electric piano modelled the way the instrument works — a tine swinging
  past a magnetic pickup. The pickup's field is non-linear, so a note barks at the attack
  and relaxes into a bell-like tone as it decays, with no filter envelope involved.
  It comes in four presets, picked on the Chords tab and remembered between visits:
  **Suitcase** (the default — soft, dark and lush, with stereo vibrato and chorus), **Stage**
  (dry, more bark), **Pad** (no hammer at all: notes swell in and hang, under deep chorus and room) and **Reed** (a reed piano, nasal, with
  its tremolo throb). A preset is the same model with the pickup moved and the effects
  changed, so adding one is an entry in `KEYS_VOICES` in `synth/keys.ts`.
- **Bass and guitar** are a plucked string solved as a sum of its modes: where it is
  plucked, where the pickup sits, how stiff it is, and how fast each mode loses energy. A
  note starts bright and mellows as it rings, and is exactly in tune.
- **Drums** are still the table of layered recipes in `engine/kit.ts` — filtered noise, swept
  tones, and a metallic partial cluster for the hats — rendered ahead of time, several
  strikes per voice, so a repeated hit is never the same sample twice.
- **One room** — a generated stereo impulse response — places the band in a shared space, and
  each drum has its own spot in the stereo field.
- **One master bus** carries the band, the click and the drone through a single safety clamp.

Why not samples or a library? A sampled piano or kit costs megabytes per instrument to
download and cache, which this offline-first app would pay on every install; a wrapper such
as Tone.js schedules the same Web Audio nodes the app already schedules sample-accurately,
and would not change what they sound like. Modelling gets most of the realism for about
5 KB of code.

Why render ahead instead of synthesising live? Each sound is computed once, in idle time
after the page loads (a few milliseconds each), into an `AudioBuffer`. Playing a note is
then the cheapest thing Web Audio does — one native buffer source — however many partials
went into it, which keeps phones glitch-free. Notes are rendered every third semitone and
re-pitched by at most a semitone, so the whole band fits in roughly 15 MB of memory.

The models are plain functions over `Float32Array`s, so `src/lib/synth/synth.test.ts` checks
them directly: tuning to within two cents, levels, decay, and that every buffer ends on
silence. `e2e/sound.spec.ts` renders a full band through the real engine offline and holds
the mix's headroom and stereo width.

## Development

```bash
npm install
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run check      # svelte-check type checking
npm test           # Vitest unit tests
npm run test:e2e   # Playwright end-to-end tests
npm run icons      # regenerate the app icons in public/
```

## MIDI out — playing the hardware

The studio can drive an external sampler instead of (or alongside) its own Web Audio synth.
It was built against a **teenage engineering EP-133 K.O. II**, whose note map it knows by
default, but nothing here is device-specific: anything that takes notes and MIDI clock works.

Open it from **MIDI** in the studio bar. Connect over USB, arm the connection, and the
shared transport sends the same bar it plays — drum grid, chord slots and bassline, swing,
accents and all — as timestamped MIDI, wrapped in start / stop and 24-PPQN clock so the
device's own sequencer stays locked to the studio's tempo.

**Each part picks its own output.** Drums to a sampler, chords and bass to a synth, one
transport and one clock across both — routing is a property of the part, because two boxes
means two USB ports rather than two channels on one wire. With a single device plugged in
there is nothing to configure: every part takes it automatically.

The two kinds of part are addressed differently, which is the thing to understand:

- **Drums address pads.** Each of the K.O. II's four groups is one octave of note numbers,
  its twelve pads sitting in panel order (`.`, `0`, `⏎`, then 1–9), so a kit voice maps to a
  group and a pad and nothing more. The kit is twelve voices and a group is twelve pads, so
  the default map is one to one: kick on the first pad and the kit climbing away from it.
- **Chords and bass address pitches** — in one of two ways, chosen per part, because a
  sampler hears a note number as one of two completely different things:
  - **Chromatic** sends real note numbers with a channel and an octave transpose. Right for
    a keyboard or synth, where it just plays. On a K.O. II it needs **KEYS** mode, and keys
    mode repoints the *whole* note map at pitches across 0–127 — so any part addressing pads
    stops being understood, and drums plus a chromatic part cannot share one K.O. II
    whatever channel they are on. The panel warns when a configuration would hit this. The
    bassline is already written in bass register (MIDI 24–47), so a real instrument wants no
    transpose; the octave control is for a sampler whose pad root sits somewhere else.
  - **Group pads** folds the part into one octave and plays a group's twelve pads, with
    `KEYS` **off** — which is what lets a single K.O. II play drums on group A and harmony
    on group C at once. The group has to be tuned on the device first: put the sound on each
    pad and set its **Pitch** a semitone apart in sound edit (`SHIFT` + `SOUND`, knob Y).
    Pressing `KEYS` also spreads a sample across the pads, but that is a mode for playing by
    hand rather than a tuning — it does not persist when you leave it. **C IS** says which
    pad the root sits on. The cost is the register: twelve pads is twelve semitones, so a
    two-octave bassline comes back as one.

  Which sample sits on those pads is chosen on the device. MIDI cannot assign one, and the
  reverse-engineered sysex path that could is not something to attempt from a browser.

Channel, transpose and **velocity** are all per part, for the same reason routing is: a
sampled hit has to be loud enough to cut, and the same number on a weighted piano is a bang.
Only the drums carry an accent value, because the grid is the one thing in the studio that
marks accents — chord slots and bass steps do not.

Mixer mutes are faders, not switches: muting a part silences the app while the hardware keeps
playing it, which is how you hand a part over. Each part has its own on/off for the wire.

On a K.O. II, three system settings are worth setting first (`SHIFT` + `ERASE`, then the
code, then `ENTER`): **101** to follow incoming clock, **110** to receive on all channels,
and **301** or **302** to turn velocity on — it ships off, so accents land flat until you do.
Most keyboards and synths need none of this: channel 1, no transpose, and they play.

**The K.O. II records what the studio sends.** Arm record on the device and the notes going
out land in its own pattern, so a groove from the library can be printed into a project and
then edited on the hardware like anything you played by hand. Set clock in (**101**) first so
the device's sequencer is running on the studio's bar line rather than its own, and turn
quantize on (`TIMING`, then `−`) unless you want the swing captured exactly as sent.

This is the only route in. The reverse-engineered `.ppak` project format covers samples and
pad assignments, but its sequencer data has never been located, so no tool can write a
pattern *file* — recording one live is what works.

There is also an audio route, for material rather than sequences. From firmware 2.5 the
EP-133 is a class-compliant USB audio interface: make it the computer's audio output, set
`usb` as the sampling source (**510**), and `SAMPLE` records the studio's own output down the
same cable — ready to chop onto a pad. That captures the app's own synth, including the parts
no pad is playing.

**Desktop only.** Web MIDI does not exist in Safari, so the button is hidden below 981px
rather than opening a panel that could never connect. Chrome, Edge and Brave all support it.
Nothing is sent until you arm the connection, and the mapping is remembered across reloads —
the armed state deliberately is not.

## Offline use

The production build includes a web app manifest and service worker. Visit the deployed app
once while online, then use your browser's **Install app** or **Add to Home Screen** action.
The complete application is precached (including its locally generated interface and icons),
so every studio mode and the Web Audio instruments remain available without a connection.
When a new version is deployed it downloads in the background and is used on the next visit.

## Installed on a phone

The layout is built for a standalone install on a notched phone. The viewport is
`viewport-fit=cover` with a translucent status bar, so the page genuinely starts underneath
the notch / Dynamic Island; `src/app.css` resolves `env(safe-area-inset-*)` into the
`--sat/--sar/--sab/--sal` custom properties once, and the studio bar, content, dock and
modal sheet all pad themselves from those. Landscape on a phone puts the transport bar and
the tab bar on a single row (see the `--dock-h` variable), which is the difference between
~106px and ~50px of fixed bottom chrome on a 390pt-tall screen.

Every file in `public/` that shows the app's mark is generated by `npm run icons` from
`scripts/make-icons.mjs` — edit the constants at the top of that script rather than the SVGs.
It emits the rounded "any" icon, a full-bleed maskable variant for Android, and PNGs, which
iOS requires: it ignores SVG icons when adding to the home screen.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs the typecheck and unit tests, builds with the correct base path
(`/<repo>/`), and publishes `dist/` to GitHub Pages on every push to `main`.

**Hosting elsewhere:** the build is a static site with no server code. Run
`VITE_BASE=/ npm run build` (or `VITE_BASE=/sub/path/` for a sub-path) and serve `dist/`
from any static host. It must be served over HTTPS for the service worker and install
prompt to work; unknown paths should fall back to `index.html`.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment →
Source** and select **GitHub Actions**. After that, each qualifying push deploys
automatically; the live URL appears in the workflow's `deploy` job summary.

## The tabs

The chrome carries what every tab shares: the **transport** (one PLAY, one tempo, driving
drums, chords and bass on a single clock), the **mixer** (mute or solo each of the three
parts — it gates audio only, so a muted part keeps its playhead and its place in the loop),
the **key/scale** picker behind one button, and the master sound toggle. On a phone the
transport rides the dock bar above the tabs, where a thumb can reach it, and the mixer and
tempo slider live in the dock panel.

Any genre's shelf offers **load the whole style** — one tap fills drums, chords and bass
from the same genre, since all three libraries shelve off one taxonomy.

- **Circle** — circle of fifths/fourths (major or minor view) with the scale and mode
  selector inline, diatonic chords for the current key/scale, substitutions and a
  "why it works" readout.
- **Drums** — a 16-step groovebox with a dependent **genre → pattern** picker: 132 grooves
  across 31 genres (rock, metal, pop, disco, funk, soul, neo-soul, gospel, boom-bap, trap,
  electro, house, tech-house, techno, trance, D&B, jungle, garage, dubstep, breaks,
  hardstyle, hardcore, jazz, soul-jazz, jazz-funk, fusion, blues, Latin, Afrobeat, reggae,
  reggaeton). Every pattern is authored as ordered *layers*, so the LAYERS chips rebuild
  the groove one part at a time. The grid shows only the instruments the pattern plays —
  add any of the 12 kit voices as a new row, or remove one — and cells are editable
  (rest → hit → accent). Swing lives here; tempo is the studio's.
- **Chords** — build a progression from the diatonic and colour/borrowed palettes, or load
  one of 122 starting points across the 31 genres. Drag to reorder. Select a placed chord
  and the **inspector** offers every move on it: extensions, inversions, a leading V or
  ii–V, and substitutions. Voicing (full/shell) and chord length (½ bar / 1 bar) are
  per-progression settings. **Silence is a slot too**: `+ REST` (or `N.C.` typed off a
  chart) places a bar the band sits out — the drums roll on, the count keeps running, the
  chords and the bass drop out. It is placed, dragged and deleted like any chord, it holds
  no key of its own, and the key-centre reading looks straight through it.
- **Bass** — one line, which is yours: a 16-step grid of *degrees*, so it transposes itself
  through every change. The 119-groove library across 31 genres loads into it as a starting
  point rather than replacing it. Under the grid the same bar is spelled out three ways —
  the count ("1 e & a"), the **pitch** every degree resolves to (with the tail showing how
  long it rings), and the **change** it resolves against, as bands under the steps they own.
  While the loop runs all of it tracks the bar in the speakers, and a readout names the note
  in your hands: *the ♭7 of A♭m9, on the &*. Use the chrome's mixer to solo it and study it
  alone.
- **Metronome** — a full practice metronome (ported from the standalone Metrognome app):
  sample-accurate Web Audio click with tap tempo, time signatures, subdivisions and accents;
  tempo automation for rhythm drills (step trainer, smooth ramps by time or bars, gap-click
  mute trainer); practice goals by bars or minutes with auto-stop; an on-device practice log;
  and experimental microphone tempo-following. It runs on its own clock, with buttons to
  copy tempo to and from the studio, and keeps ticking while you browse other tabs.
- **Learn** — a library. Seven shelves hold books, books hold pages: **Harmony** (the
  eight-chapter jazz & groove harmony book, the jazz and classical palettes whose chips still
  place chords into your progression, the chord inspector explained, chord shapes on the
  circle), **Scales & melody** (scales, pentatonics, arpeggios, licks), **Fretboard** (boxes,
  CAGED, soloing, barre and bass chords), **Rhythm** (how patterns are built, and the anatomy
  of your loaded groove), **Bass** (the moves behind a line, reading the grid, and the
  annotated groove library), **Song form** (structures as proportional timelines) and
  **Practice** (ear training and sight reading). A collapsible tree with a search box sits
  beside the page on desktop and folds behind **BROWSE** on a phone; breadcrumbs lead back up,
  every shelf and book has an index page, a pager reads on front to back, and the app reopens
  on the page you left. The command palette lists every page too.
