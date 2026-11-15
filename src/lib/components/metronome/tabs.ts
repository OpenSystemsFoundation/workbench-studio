// The sections under the click. Kept in a module of their own so the shell and
// the transport (whose status chips jump to a section) agree on the ids.
export type MetroTab = 'practice' | 'trainer' | 'drone' | 'mic';

export const METRO_TABS: { id: MetroTab; label: string }[] = [
  { id: 'practice', label: 'Session' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'drone', label: 'Drone' },
  { id: 'mic', label: 'Mic' },
];
