import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SpotifyUser {
    id: string;
    display_name: string;
    email: string;
}

interface SpotifyAuthState {
    isAuthenticated: boolean;
    user: SpotifyUser | null;
    accessToken: string | null;
    login: () => void;
    logout: () => void;
}

const SpotifyAuthContext = createContext<SpotifyAuthState | undefined>(undefined);

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'http://127.0.0.1:5173/settings';
const SCOPES = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read'
].join(' ');

// PKCE helper functions
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export function SpotifyAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<SpotifyUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        // Check for stored tokens on mount
        const storedToken = localStorage.getItem('spotify_access_token');
        const storedExpiry = localStorage.getItem('spotify_expires_at');
        const storedUser = localStorage.getItem('spotify_user');

        if (storedToken && storedExpiry && storedUser) {
            const expiresAt = parseInt(storedExpiry);
            if (Date.now() < expiresAt) {
                setAccessToken(storedToken);
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);
            } else {
                // Token expired, try to refresh
                refreshToken();
            }
        }

        // Check for OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            handleCallback(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const login = async () => {
        const codeVerifier = generateRandomString(64);
        const hashed = await sha256(codeVerifier);
        const codeChallenge = base64encode(hashed);

        // Store verifier for later
        localStorage.setItem('spotify_code_verifier', codeVerifier);

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('code_challenge_method', 'S256');
        authUrl.searchParams.append('code_challenge', codeChallenge);
        authUrl.searchParams.append('scope', SCOPES);

        window.location.href = authUrl.toString();
    };

    const handleCallback = async (code: string) => {
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            console.error('No code verifier found');
            return;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier,
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                const expiresAt = Date.now() + data.expires_in * 1000;

                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_refresh_token', data.refresh_token);
                localStorage.setItem('spotify_expires_at', expiresAt.toString());
                localStorage.removeItem('spotify_code_verifier');

                setAccessToken(data.access_token);

                // Fetch user info
                const userResponse = await fetch('https://api.spotify.com/v1/me', {
                    headers: { Authorization: `Bearer ${data.access_token}` },
                });
                const userData = await userResponse.json();

                const spotifyUser = {
                    id: userData.id,
                    display_name: userData.display_name,
                    email: userData.email,
                };

                localStorage.setItem('spotify_user', JSON.stringify(spotifyUser));
                setUser(spotifyUser);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Spotify auth error:', error);
        }
    };

    const refreshToken = async () => {
        const refreshTokenValue = localStorage.getItem('spotify_refresh_token');
        if (!refreshTokenValue) return;

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    grant_type: 'refresh_token',
                    refresh_token: refreshTokenValue,
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                const expiresAt = Date.now() + data.expires_in * 1000;

                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_expires_at', expiresAt.toString());

                setAccessToken(data.access_token);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            logout();
        }
    };

    const logout = () => {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_expires_at');
        localStorage.removeItem('spotify_user');
        localStorage.removeItem('spotify_code_verifier');

        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <SpotifyAuthContext.Provider value={{ isAuthenticated, user, accessToken, login, logout }}>
            {children}
        </SpotifyAuthContext.Provider>
    );
}

export function useSpotifyAuth() {
    const context = useContext(SpotifyAuthContext);
    if (!context) {
        throw new Error('useSpotifyAuth must be used within SpotifyAuthProvider');
    }
    return context;
}
