import { NextRequest, NextResponse } from 'next/server';
import { fetchTrackData, parseSpotifyTrackId } from '@/lib/spotify/SpotifyClient';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const trackId = parseSpotifyTrackId(url);
  if (!trackId) {
    return NextResponse.json(
      { error: 'Could not parse a Spotify track ID from the given URL or URI.' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchTrackData(trackId);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
