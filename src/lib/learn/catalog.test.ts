import { describe, it, expect } from 'vitest';
import {
  LIBRARY, findNode, libraryPages, pathTo, pathLabel, neighbours, pageCount,
  searchLibrary, patternCategory, type LibraryNode,
} from './catalog';
import { jazzChapters, PAT_GROUPS, PAT_SHAPES_TAB } from '../engine/data';
import { FRET_TABS } from '../engine/fretpatterns';

const all: LibraryNode[] = [];
(function walk(n: LibraryNode) { all.push(n); n.children?.forEach(walk); })(LIBRARY);

describe('the Learn library catalogue', () => {
  it('gives every node a unique id that is its path from the root', () => {
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
    for (const n of all) {
      for (const c of n.children ?? []) {
        expect(c.id.startsWith(n.id ? n.id + '/' : '')).toBe(true);
        expect(c.id.slice(n.id ? n.id.length + 1 : 0)).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it('makes every node either a branch with children or a page, never both or neither', () => {
    for (const n of all) {
      expect(!!n.page !== !!n.children?.length, n.id).toBe(true);
      expect(n.title, n.id).toBeTruthy();
      expect(n.blurb, n.id).toBeTruthy();
    }
  });

  it('shelves everything the engine has to teach', () => {
    const pages = libraryPages().map((n) => n.page!);
    expect(pages.filter((p) => p.kind === 'jazz').map((p) => p.kind === 'jazz' && p.chapter))
      .toEqual(jazzChapters(0).map((_, i) => i));
    expect(pages.flatMap((p) => (p.kind === 'patterns' ? [p.group] : [])).sort()).toEqual([...PAT_GROUPS].sort());
    expect(pages.flatMap((p) => (p.kind === 'fretboard' ? [p.tab] : []))).toEqual(FRET_TABS);
  });

  it('finds nodes and builds the breadcrumb trail', () => {
    expect(findNode('')).toBe(LIBRARY);
    expect(findNode('no/such/page')).toBeUndefined();
    expect(pathTo('harmony/palettes/jazz').map((n) => n.title))
      .toEqual(['Library', 'Harmony', 'Chord palettes', 'The jazz palette']);
    expect(pathLabel('harmony/palettes/jazz')).toBe('Harmony › Chord palettes › The jazz palette');
    expect(pathTo('no/such/page')).toEqual([LIBRARY]);
  });

  it('pages front to back across book and shelf boundaries', () => {
    const pages = libraryPages();
    expect(neighbours(pages[0].id).prev).toBeUndefined();
    expect(neighbours(pages.at(-1)!.id).next).toBeUndefined();
    const lastChapter = findNode('harmony/jazz')!.children!.at(-1)!;
    expect(neighbours(lastChapter.id).next?.id).toBe('harmony/palettes/jazz');
    // a branch is not a page, so it has no neighbours
    expect(neighbours('harmony')).toEqual({});
    for (let i = 1; i < pages.length; i++) expect(neighbours(pages[i].id).prev).toBe(pages[i - 1]);
  });

  it('counts the pages under a branch', () => {
    expect(pageCount(LIBRARY)).toBe(libraryPages().length);
    expect(pageCount(findNode('harmony/jazz')!)).toBe(jazzChapters(0).length);
    expect(pageCount(findNode('practice/ear')!)).toBe(1);
  });

  it('searches titles, shelves, blurbs and keywords, title hits first', () => {
    expect(searchLibrary('')).toEqual([]);
    expect(searchLibrary('zzzz')).toEqual([]);
    expect(searchLibrary('caged')[0].id).toBe('fretboard/caged');
    expect(searchLibrary('clave').map((n) => n.id)).toContain('rhythm/concepts');
    expect(searchLibrary('harmony borrowing')[0].id).toBe('harmony/jazz/borrowing');
    expect(searchLibrary('PALETTE jazz')[0].id).toBe('harmony/palettes/jazz');
    expect(searchLibrary('a', 3)).toHaveLength(3);
  });

  it('maps pattern-family pages onto the pattern library category', () => {
    expect(patternCategory(findNode('scales/arpeggios')!.page)).toBe('Arpeggios');
    expect(patternCategory(findNode('fretboard/caged')!.page)).toBe('CAGED');
    expect(patternCategory(findNode('harmony/chord-shapes')!.page)).toBe(PAT_SHAPES_TAB);
    expect(patternCategory(findNode('practice/ear')!.page)).toBeNull();
    expect(patternCategory(undefined)).toBeNull();
  });
});
