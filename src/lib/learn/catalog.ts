// The Learn library's catalogue: ONE tree that says what there is to read and
// where it is shelved. Shelves hold books, books hold pages, and a page names
// the lesson that renders it.
//
// Everything that navigates Learn reads this — the tree in the side rail, the
// breadcrumbs, the shelf and book index pages, the previous/next pager, the
// search box and the command palette — so adding a lesson is one entry here
// and nothing else has to learn about it.
//
// Pure data and pure functions: no store, no DOM, unit-tested.
import { jazzChapters, PAT_GROUPS, PAT_SHAPES_TAB } from '../engine/data';
import { FRET_TABS } from '../engine/fretpatterns';

/** What a page shows. The page registry maps each kind to its component. */
export type LibraryPage =
  | { kind: 'jazz'; chapter: number }
  | { kind: 'palette'; palette: 'jazz' | 'classical' }
  | { kind: 'chord-moves' }
  | { kind: 'chord-shapes' }
  | { kind: 'patterns'; group: string }
  | { kind: 'fretboard'; tab: string }
  | { kind: 'rhythm-concepts' }
  | { kind: 'groove-anatomy' }
  | { kind: 'bass-moves' }
  | { kind: 'bass-grid' }
  | { kind: 'bass-library' }
  | { kind: 'song-forms' }
  | { kind: 'ear' }
  | { kind: 'reading' };

export type PageKind = LibraryPage['kind'];

export interface LibraryNode {
  /** Slash path from the root, e.g. `harmony/jazz/extensions`. '' is the root. */
  id: string;
  title: string;
  /** One line on what is inside; shown on index cards and under the page title. */
  blurb: string;
  /** Small-caps label: the angle a page takes, or what a shelf is about. */
  tag?: string;
  /** Extra words the search box should match that the title does not carry. */
  keywords?: string;
  children?: LibraryNode[];
  page?: LibraryPage;
}

type Draft = Omit<LibraryNode, 'id' | 'children'> & { slug: string; children?: Draft[] };

const slug = (s: string): string =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// What each pattern group and fretboard tab is, in a line. The titles come
// from the engine tables so a new group shelves itself; a missing blurb falls
// back to a generic one rather than breaking the tree.
const PATTERN_BLURB: Record<string, string> = {
  'Scales': 'The seven-note scales and modes, each against the chord it belongs to.',
  'Pentatonic & Blues': 'Five and six-note scales that cannot hit a wrong note.',
  'Arpeggios': 'Chords played one note at a time: the skeleton of every line.',
  'Genre Licks': 'Short phrases that carry a style in a bar.',
  'Bassline Grooves': 'Bass figures as degrees, ready to move through any change.',
};
const FRET_BLURB: Record<string, string> = {
  'Fretboard Boxes': 'Movable scale boxes, anchored to your key.',
  'CAGED': 'Five open shapes that map the whole neck.',
  'Soloing': 'Where to stand on the neck when it is your turn.',
  'Barre Chords': 'One grip, twelve keys.',
  'Bass Chords': 'Chord shapes that work down low.',
};

const patternPage = (group: string): Draft => ({
  slug: slug(group), title: group, page: { kind: 'patterns', group },
  blurb: PATTERN_BLURB[group] ?? 'Patterns lit on bass, guitar and piano.',
});

const DRAFT: Draft[] = [
  {
    slug: 'harmony', title: 'Harmony', tag: 'CHORDS',
    blurb: 'How chords are built, coloured and moved, with every chord playable and placeable.',
    children: [
      {
        slug: 'jazz', title: 'Jazz & groove harmony', tag: 'EIGHT CHAPTERS',
        blurb: 'Eight building blocks, from extensions to the ii–V–I and beyond.',
        children: jazzChapters(0).map((c, chapter) => ({
          slug: slug(c.name), title: c.name, tag: c.tag, keywords: c.key,
          blurb: c.intro.split(/(?<=[.!?])\s/)[0].replace(/\*/g, ''),
          page: { kind: 'jazz' as const, chapter },
        })),
      },
      {
        slug: 'palettes', title: 'Chord palettes', tag: 'BUILD WITH IT',
        blurb: 'The two sets of chords the chapters draw from, ready to drop into your progression.',
        children: [
          { slug: 'jazz', title: 'The jazz palette', tag: 'SEVENTHS', keywords: 'borrowed secondary dominants diatonic', blurb: 'Diatonic sevenths, borrowed colour and secondary dominants.', page: { kind: 'palette', palette: 'jazz' } },
          { slug: 'classical', title: 'The classical palette', tag: 'VOICE LEADING', keywords: 'cadences triads period', blurb: 'Plain triads, cadences and period progressions.', page: { kind: 'palette', palette: 'classical' } },
        ],
      },
      { slug: 'chord-moves', title: 'What you can do to a chord', tag: 'LIVE', keywords: 'inspector substitute invert recolour', blurb: 'Recolour, invert, lead into or substitute the chord you have selected.', page: { kind: 'chord-moves' } },
      { slug: 'chord-shapes', title: 'Chord shapes on the circle', tag: 'GEOMETRY', keywords: 'circle of fifths polygon quality', blurb: 'Every chord quality draws one fixed shape on the circle of fifths.', page: { kind: 'chord-shapes' } },
    ],
  },
  {
    slug: 'scales', title: 'Scales & melody', tag: 'LINES',
    blurb: 'Scales, arpeggios and licks, lit on bass, guitar and piano in your key.',
    children: PAT_GROUPS.filter((g) => g !== 'Bassline Grooves').map(patternPage),
  },
  {
    slug: 'fretboard', title: 'Fretboard', tag: 'THE NECK',
    blurb: 'Movable shapes for guitar and bass, drawn as diagrams you can play.',
    children: FRET_TABS.map((tab) => ({
      slug: slug(tab), title: tab, page: { kind: 'fretboard' as const, tab },
      blurb: FRET_BLURB[tab] ?? 'Neck diagrams, anchored to your key.',
    })),
  },
  {
    slug: 'rhythm', title: 'Rhythm', tag: 'DRUMS',
    blurb: 'How drum patterns are built, from the sixteen-step grid to clave and swing.',
    children: [
      { slug: 'concepts', title: 'The building blocks', tag: 'ELEVEN IDEAS', keywords: 'backbeat syncopation clave swing shuffle tresillo ghost notes subdivision', blurb: 'Eleven ideas behind every groove, each with a one-bar demo.', page: { kind: 'rhythm-concepts' } },
      { slug: 'your-groove', title: 'Your groove, layer by layer', tag: "HOW IT'S BUILT", keywords: 'layers drums anatomy programming', blurb: 'The pattern loaded in Drums, taken apart one layer at a time.', page: { kind: 'groove-anatomy' } },
    ],
  },
  {
    slug: 'bass', title: 'Bass', tag: 'LOW END',
    blurb: 'The moves behind a bassline, and a library of grooves that use them.',
    children: [
      { slug: 'moves', title: 'Tricks of the trade', tag: 'BASSLINE MOVES', keywords: 'walking approach octave', blurb: 'The handful of moves behind every bassline, each with a demo.', page: { kind: 'bass-moves' } },
      { slug: 'grid', title: 'Reading the grid', tag: '16 SIXTEENTHS', keywords: 'degrees legend cells', blurb: 'What the coloured cells in the Bass tab mean.', page: { kind: 'bass-grid' } },
      ...PAT_GROUPS.filter((g) => g === 'Bassline Grooves').map(patternPage),
      { slug: 'library', title: 'The groove library', tag: 'ANNOTATED', keywords: 'genre basslines', blurb: 'Every bassline in the studio, with what it is doing and why it works.', page: { kind: 'bass-library' } },
    ],
  },
  {
    slug: 'song-form', title: 'Song form', tag: 'STRUCTURE',
    blurb: 'How songs are built in time.',
    children: [
      { slug: 'structures', title: 'Song structures', tag: 'TIMELINES', keywords: 'verse chorus bridge forms AABA blues', blurb: 'Eight genres, eight maps for keeping a listener the whole ride.', page: { kind: 'song-forms' } },
    ],
  },
  {
    slug: 'practice', title: 'Practice', tag: 'DRILLS',
    blurb: 'Drills for the ear and the eye.',
    children: [
      { slug: 'ear', title: 'Ear training', tag: 'LISTEN', keywords: 'intervals chords drill', blurb: 'Name what you hear: intervals, chords and keys.', page: { kind: 'ear' } },
      { slug: 'reading', title: 'Sight reading', tag: 'READ', keywords: 'staff notes clef drill', blurb: 'Read the staff and answer on the instruments.', page: { kind: 'reading' } },
    ],
  },
];

function build(d: Draft, parent: string): LibraryNode {
  const { slug: s, children, ...rest } = d;
  const id = parent ? parent + '/' + s : s;
  return { ...rest, id, ...(children ? { children: children.map((c) => build(c, id)) } : {}) };
}

/** The front desk: the root of the tree, whose children are the shelves. */
export const LIBRARY: LibraryNode = {
  id: '', title: 'Library',
  blurb: 'Everything the studio can teach, shelved by subject. Every chord plays, every demo runs through the real instruments, and anything you like can be placed straight into what you are building.',
  children: DRAFT.map((d) => build(d, '')),
};

const INDEX = new Map<string, LibraryNode>();
const PARENT = new Map<string, LibraryNode>();
const LEAVES: LibraryNode[] = [];
(function walk(n: LibraryNode) {
  INDEX.set(n.id, n);
  if (n.page) LEAVES.push(n);
  for (const c of n.children ?? []) { PARENT.set(c.id, n); walk(c); }
})(LIBRARY);

/** The node at `id`, or undefined if nothing is shelved there. */
export function findNode(id: string): LibraryNode | undefined { return INDEX.get(id); }

/** Every page, in reading order. */
export function libraryPages(): readonly LibraryNode[] { return LEAVES; }

/** Root → … → node: the breadcrumb trail. Unknown ids give just the root. */
export function pathTo(id: string): LibraryNode[] {
  const out: LibraryNode[] = [];
  for (let n = INDEX.get(id); n; n = PARENT.get(n.id)) out.unshift(n);
  return out.length ? out : [LIBRARY];
}

/** Titles from the shelf down, e.g. `Harmony › Chord palettes › The jazz palette`. */
export function pathLabel(id: string): string {
  return pathTo(id).slice(1).map((n) => n.title).join(' › ');
}

/** The pages either side of this one in reading order (pages only). */
export function neighbours(id: string): { prev?: LibraryNode; next?: LibraryNode } {
  const i = LEAVES.findIndex((n) => n.id === id);
  if (i < 0) return {};
  return { prev: LEAVES[i - 1], next: LEAVES[i + 1] };
}

/** How many pages sit under a node (1 for a page itself). */
export function pageCount(n: LibraryNode): number {
  return n.page ? 1 : (n.children ?? []).reduce((acc, c) => acc + pageCount(c), 0);
}

/**
 * Search the catalogue. Every word of the query has to appear somewhere in a
 * node's title, tag, blurb, keywords or the titles of the shelves above it, so
 * "jazz palette" and "harmony borrowed" both land. Title hits sort first.
 */
export function searchLibrary(query: string, limit = 12): LibraryNode[] {
  const toks = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const scored: Array<{ n: LibraryNode; score: number; order: number }> = [];
  let order = 0;
  for (const n of INDEX.values()) {
    if (!n.id) continue;
    const title = n.title.toLowerCase();
    const hay = [pathLabel(n.id), n.tag, n.blurb, n.keywords].filter(Boolean).join(' ').toLowerCase();
    if (!toks.every((t) => hay.includes(t))) continue;
    const score = toks.filter((t) => title.includes(t)).length * 2 + (n.page ? 1 : 0);
    scored.push({ n, score, order: order++ });
  }
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).slice(0, limit).map((x) => x.n);
}

/** The pattern-library category a page shows, if it is one of that family. */
export function patternCategory(page: LibraryPage | undefined): string | null {
  if (!page) return null;
  if (page.kind === 'patterns') return page.group;
  if (page.kind === 'fretboard') return page.tab;
  if (page.kind === 'chord-shapes') return PAT_SHAPES_TAB;
  return null;
}
