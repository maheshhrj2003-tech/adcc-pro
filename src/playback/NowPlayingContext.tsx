import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import type { DownloadRecord } from '../api/downloads';
import type { SrtCue } from '../utils/srt';

// Holds whatever is currently playing app-wide, independent of which screen
// is mounted. PlayerScreen is just a "view" over this — when it unmounts
// (back button, swipe-back, navigating elsewhere) it hands the live session
// off here instead of tearing it down, which is what lets the floating
// mini-player keep the movie going while you browse the rest of the app.
interface NowPlayingValue {
  record: DownloadRecord | null;
  sound: Audio.Sound | null;
  cues: SrtCue[];
  positionSec: number;
  durationSec: number;
  playing: boolean;
  adOn: boolean;
  // true = the floating mini-player is showing; false = the full
  // PlayerScreen owns the UI for this session right now.
  minimized: boolean;
  setPositionSec: React.Dispatch<React.SetStateAction<number>>;
  setDurationSec: React.Dispatch<React.SetStateAction<number>>;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setAdOn: React.Dispatch<React.SetStateAction<boolean>>;
  matches: (slug: string, languageCode: string) => boolean;
  attach: (record: DownloadRecord, sound: Audio.Sound | null, cues: SrtCue[], initialAdOn: boolean) => void;
  minimize: () => void;
  restore: () => void;
  stop: () => Promise<void>;
}

const NowPlayingContext = createContext<NowPlayingValue | undefined>(undefined);

export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<DownloadRecord | null>(null);
  const [cues, setCues] = useState<SrtCue[]>([]);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [adOn, setAdOn] = useState(true);
  const [minimized, setMinimized] = useState(false);

  // A ref, not state — the Audio.Sound instance keeps playing in the
  // background regardless of re-renders; consumers read it straight off
  // this object on every provider render, so it stays current without
  // needing its own state slot.
  const soundRef = useRef<Audio.Sound | null>(null);

  const matches = useCallback(
    (slug: string, languageCode: string) => !!record && record.slug === slug && record.languageCode === languageCode,
    [record]
  );

  const attach = useCallback(
    (rec: DownloadRecord, sound: Audio.Sound | null, newCues: SrtCue[], initialAdOn: boolean) => {
      soundRef.current = sound;
      setRecord(rec);
      setCues(newCues);
      setPositionSec(0);
      setDurationSec(0);
      setPlaying(false);
      setAdOn(initialAdOn);
      setMinimized(false);
    },
    []
  );

  const minimize = useCallback(() => setMinimized(true), []);
  const restore = useCallback(() => setMinimized(false), []);

  const stop = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      await s.stopAsync().catch(() => {});
      await s.unloadAsync().catch(() => {});
    }
    setRecord(null);
    setCues([]);
    setPositionSec(0);
    setDurationSec(0);
    setPlaying(false);
    setMinimized(false);
  }, []);

  return (
    <NowPlayingContext.Provider
      value={{
        record,
        sound: soundRef.current,
        cues,
        positionSec,
        durationSec,
        playing,
        adOn,
        minimized,
        setPositionSec,
        setDurationSec,
        setPlaying,
        setAdOn,
        matches,
        attach,
        minimize,
        restore,
        stop,
      }}
    >
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying(): NowPlayingValue {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) throw new Error('useNowPlaying must be used within NowPlayingProvider');
  return ctx;
}
