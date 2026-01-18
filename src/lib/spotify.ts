// This service now uses tokens from SpotifyAuthContext instead of Appwrite
// Import useSpotifyAuth() hook in components to get the access token

let cachedToken: string | null = null;

export function setSpotifyToken(token: string | null) {
    cachedToken = token;
}

async function getToken(): Promise<string> {
    if (!cachedToken) {
        throw new Error('Spotify not authenticated. Please connect Spotify in Settings.');
    }
    return cachedToken;
}

export class SpotifyService {
    static async getPlaybackState() {
        try {
            const token = await getToken();
            const res = await fetch('https://api.spotify.com/v1/me/player', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 204) return null;
            if (!res.ok) {
                if (res.status === 401) {
                    console.error('[Spotify] Token expired or invalid');
                }
                return null;
            }

            return await res.json();
        } catch (e) {
            console.error('[Spotify] Playback state error:', e);
            return null;
        }
    }

    static async play() {
        try {
            const token = await getToken();
            await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('[Spotify] Play error:', e);
        }
    }

    static async pause() {
        try {
            const token = await getToken();
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('[Spotify] Pause error:', e);
        }
    }

    static async next() {
        try {
            const token = await getToken();
            await fetch('https://api.spotify.com/v1/me/player/next', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('[Spotify] Next error:', e);
        }
    }

    static async previous() {
        try {
            const token = await getToken();
            await fetch('https://api.spotify.com/v1/me/player/previous', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('[Spotify] Previous error:', e);
        }
    }

    static async getDevices() {
        try {
            const token = await getToken();
            const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) return [];
            const data = await res.json();
            return data.devices || [];
        } catch (e) {
            console.error('[Spotify] Devices error:', e);
            return [];
        }
    }

    static async getPlaylists() {
        try {
            const token = await getToken();
            const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) return [];
            const data = await res.json();
            return data.items || [];
        } catch (e) {
            console.error('[Spotify] Playlists error:', e);
            return [];
        }
    }

    static async getPlaylistTracks(playlistId: string) {
        try {
            const token = await getToken();
            const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) return [];
            const data = await res.json();
            return data.items || [];
        } catch (e) {
            console.error('[Spotify] Playlist tracks error:', e);
            return [];
        }
    }

    static async playTrack(uri: string, contextUri?: string) {
        try {
            const token = await getToken();
            const body: any = { uris: [uri] };
            if (contextUri) body.context_uri = contextUri;

            await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        } catch (e) {
            console.error('[Spotify] Play track error:', e);
        }
    }

    static async getQueue() {
        try {
            const token = await getToken();
            const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error('[Spotify] Queue error:', e);
            return null;
        }
    }
}
