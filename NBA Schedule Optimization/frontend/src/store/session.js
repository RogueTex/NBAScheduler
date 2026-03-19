import { create } from 'zustand';

export const useSession = create((set, get) => ({
  sessionId: null,
  nSamples: 0,
  eastSeeds: [],
  westSeeds: [],
  lockedResults: {},   // { [seriesKey]: { winner, length } }
  sampleCount: 0,      // surviving samples after locks
  watchVenue: '',      // venue being watched in bracket lock
  lockDelta: null,     // { seriesLabel, gained: [{date, from, to}], lost: [{date, from, to}] } | null

  setSession: (sessionId, nSamples, eastSeeds, westSeeds) =>
    set({ sessionId, nSamples, eastSeeds, westSeeds, sampleCount: nSamples, lockedResults: {} }),

  addLock: (seriesKey, winner, length, newSampleCount) =>
    set((s) => ({
      lockedResults: { ...s.lockedResults, [seriesKey]: { winner, length } },
      sampleCount: newSampleCount,
    })),

  removeLock: (seriesKey, newSampleCount) =>
    set((s) => {
      const updated = { ...s.lockedResults };
      delete updated[seriesKey];
      return { lockedResults: updated, sampleCount: newSampleCount };
    }),

  resetAllLocks: () =>
    set((s) => ({ lockedResults: {}, sampleCount: s.nSamples })),

  hasSession: () => !!get().sessionId,

  setWatchVenue: (venue) => set({ watchVenue: venue }),

  setLockDelta: (delta) => set({ lockDelta: delta }),

  clearLockDelta: () => set({ lockDelta: null }),
}));
