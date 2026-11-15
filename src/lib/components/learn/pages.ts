// Which component renders which kind of page. The catalogue says what a page
// *is*; this says what draws it. A new kind of lesson is a component plus one
// line here — the tree, breadcrumbs, pager and search pick it up from the
// catalogue on their own.
import type { Component } from 'svelte';
import type { LibraryPage, PageKind } from '../../learn/catalog';
import EarMode from '../EarMode.svelte';
import ReadingMode from '../ReadingMode.svelte';
import JazzChapterPage from './pages/JazzChapterPage.svelte';
import PalettePage from './pages/PalettePage.svelte';
import ChordMovesPage from './pages/ChordMovesPage.svelte';
import ChordShapesPage from './pages/ChordShapesPage.svelte';
import PatternGroupPage from './pages/PatternGroupPage.svelte';
import FretboardPage from './pages/FretboardPage.svelte';
import RhythmConceptsPage from './pages/RhythmConceptsPage.svelte';
import GrooveAnatomyPage from './pages/GrooveAnatomyPage.svelte';
import BassMovesPage from './pages/BassMovesPage.svelte';
import BassGridPage from './pages/BassGridPage.svelte';
import BassLibraryPage from './pages/BassLibraryPage.svelte';
import SongFormsPage from './pages/SongFormsPage.svelte';

/** Every page gets the catalogue's description of itself; most ignore it. */
export type PageComponent = Component<{ page: LibraryPage }>;

// A page that takes no props still accepts (and ignores) `page`.
const plain = (c: Component): PageComponent => c as unknown as PageComponent;

export const PAGES: Record<PageKind, PageComponent> = {
  'jazz': plain(JazzChapterPage),
  'palette': PalettePage,
  'chord-moves': plain(ChordMovesPage),
  'chord-shapes': plain(ChordShapesPage),
  'patterns': plain(PatternGroupPage),
  'fretboard': plain(FretboardPage),
  'rhythm-concepts': plain(RhythmConceptsPage),
  'groove-anatomy': plain(GrooveAnatomyPage),
  'bass-moves': plain(BassMovesPage),
  'bass-grid': plain(BassGridPage),
  'bass-library': plain(BassLibraryPage),
  'song-forms': plain(SongFormsPage),
  'ear': plain(EarMode),
  'reading': plain(ReadingMode),
};
