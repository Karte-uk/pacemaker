import type { SpotifyTrack, SpotifyAudioFeatures, SpotifyTrackData } from './types';

// ─── Token cache (server-side singleton) ──────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env.local');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

// ─── URL parsing ──────────────────────────────────────────────────────────────
export function parseSpotifyTrackId(input: string): string | null {
  // Handle formats:
  //   https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC
  //   https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=...
  //   spotify:track:4uLU6hMCjMI75M1A2tKUQC
  //   4uLU6hMCjMI75M1A2tKUQC  (bare ID)
  const urlMatch = input.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  const uriMatch = input.match(/spotify:track:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  if (/^[A-Za-z0-9]{22}$/.test(input.trim())) return input.trim();

  return null;
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function spotifyFetch(path: string): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
}

export async function fetchTrackData(trackId: string): Promise<SpotifyTrackData> {
  const [trackRes, featuresRes] = await Promise.allSettled([
    spotifyFetch(`/tracks/${trackId}`),
    spotifyFetch(`/audio-features/${trackId}`),
  ]);

  // Track metadata is required
  if (trackRes.status === 'rejected' || !trackRes.value.ok) {
    throw new Error(`Could not fetch track. Check the Spotify URL and your API credentials.`);
  }
  const raw = await trackRes.value.json();

  const track: SpotifyTrack = {
    id: raw.id,
    name: raw.name,
    artist: raw.artists.map((a: { name: string }) => a.name).join(', '),
    album: raw.album.name,
    albumArt: raw.album.images[0]?.url ?? '',
    previewUrl: raw.preview_url,
    spotifyUrl: raw.external_urls.spotify,
    durationMs: raw.duration_ms,
  };

  // Audio features may be unavailable (deprecated for new Spotify apps Nov 2024)
  let features: SpotifyAudioFeatures | null = null;
  if (featuresRes.status === 'fulfilled' && featuresRes.value.ok) {
    const f = await featuresRes.value.json();
    features = {
      bpm: Math.round(f.tempo),
      energy: f.energy,
      danceability: f.danceability,
      valence: f.valence,
      loudness: f.loudness,
      key: f.key,
      mode: f.mode,
    };
  }

  return { track, features };
}
