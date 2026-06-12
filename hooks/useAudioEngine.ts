'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import type { AudioAnalysisData, AudioSourceType } from '@/types/audio';
import type { SpotifyAudioFeatures } from '@/lib/spotify/types';

const IDLE_ANALYSIS: AudioAnalysisData = {
  frequencyData: new Uint8Array(1024),
  timedomainData: new Uint8Array(2048).fill(128),
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  bpm: 128,
  beat: false,
  bufferLength: 1024,
  sampleRate: 44100,
};

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysisData>(IDLE_ANALYSIS);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpm] = useState(128);
  // When set, override the analyzer's detected BPM with Spotify's known BPM
  const spotifyFeaturesRef = useRef<SpotifyAudioFeatures | null>(null);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  const startSource = useCallback(async (type: AudioSourceType, file?: File) => {
    const engine = engineRef.current;
    if (!engine) return;
    setError(null);
    try {
      await engine.setSource(type, file);
      engine.startAnalysisLoop((data) => {
        const features = spotifyFeaturesRef.current;
        if (features) {
          // Use Spotify's authoritative BPM; keep beat detection from live audio
          const enriched: AudioAnalysisData = { ...data, bpm: features.bpm };
          setAnalysis(enriched);
          setBpm(features.bpm);
        } else {
          setAnalysis(data);
          setBpm(data.bpm);
        }
      });
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audio source');
      setIsActive(false);
    }
  }, []);

  const setSpotifyFeatures = useCallback((features: SpotifyAudioFeatures | null) => {
    spotifyFeaturesRef.current = features;
    if (features) setBpm(features.bpm);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stopAnalysisLoop();
    setIsActive(false);
    setAnalysis(IDLE_ANALYSIS);
  }, []);

  const togglePlayPause = useCallback((playing: boolean) => {
    const ctx = engineRef.current?.audioContext;
    const file = engineRef.current?.fileSource;
    if (!ctx || !file) return;
    if (playing) file.play(ctx);
    else file.pause(ctx);
  }, []);

  return { analysis, isActive, error, bpm, startSource, stop, togglePlayPause, setSpotifyFeatures };
}
