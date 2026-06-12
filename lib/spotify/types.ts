export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;         // URL
  previewUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
}

export interface SpotifyAudioFeatures {
  bpm: number;              // tempo
  energy: number;           // 0-1
  danceability: number;     // 0-1
  valence: number;          // 0-1 (mood: sad → happy)
  loudness: number;         // dBFS, typically -60 to 0
  key: number;              // Pitch class 0-11
  mode: 0 | 1;              // 0 = minor, 1 = major
}

export interface SpotifyTrackData {
  track: SpotifyTrack;
  features: SpotifyAudioFeatures | null;  // null if API deprecated / unavailable
}

// Map Spotify energy (0-1) → visual sensitivity multiplier
export function energyToSensitivity(energy: number): number {
  return 0.4 + energy * 0.6;  // 0.4 – 1.0 range
}

// Map Spotify valence + energy → suggested color palette name
export function moodToPreset(energy: number, valence: number): string {
  if (energy > 0.7 && valence > 0.6) return 'Fire';
  if (energy > 0.7 && valence < 0.4) return 'Tunnel';
  if (energy < 0.4 && valence > 0.5) return 'Ocean';
  if (valence < 0.35) return 'Pink';
  return 'Neon';
}
