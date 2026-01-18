import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface HueUser {
    username: string;
    bridgeId: string;
}

interface HueAuthState {
    isAuthenticated: boolean;
    user: HueUser | null;
    accessToken: string | null;
    login: () => void;
    logout: () => void;
}

const HueAuthContext = createContext<HueAuthState | undefined>(undefined);

const CLIENT_ID = import.meta.env.VITE_HUE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_HUE_CLIENT_SECRET;
const REDIRECT_URI = 'https://home-dash.sigve.dev/settings';

// Generate random state for OAuth
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

export function HueAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<HueUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        // Check for stored tokens on mount
        const storedToken = localStorage.getItem('hue_access_token');
        const storedExpiry = localStorage.getItem('hue_expires_at');
        const storedUser = localStorage.getItem('hue_user');

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
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('hue_oauth_state');

        if (code && state && state === storedState) {
            handleCallback(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            localStorage.removeItem('hue_oauth_state');
        }
    }, []);

    const login = () => {
        const state = generateRandomString(16);
        const deviceId = 'home-dash-' + generateRandomString(8);
        const deviceName = 'Home Dashboard';

        // Store state for verification
        localStorage.setItem('hue_oauth_state', state);

        const authUrl = new URL('https://api.meethue.com/v2/oauth2/authorize');
        authUrl.searchParams.append('client_id', CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('deviceid', deviceId);
        authUrl.searchParams.append('devicename', deviceName);

        window.location.href = authUrl.toString();
    };

    const handleCallback = async (code: string) => {
        try {
            const response = await fetch('https://api.meethue.com/v2/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI,
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                const expiresAt = Date.now() + data.expires_in * 1000;

                localStorage.setItem('hue_access_token', data.access_token);
                localStorage.setItem('hue_refresh_token', data.refresh_token);
                localStorage.setItem('hue_expires_at', expiresAt.toString());

                setAccessToken(data.access_token);

                // Fetch user/bridge info
                const userResponse = await fetch('https://api.meethue.com/route/api/0/config', {
                    headers: { Authorization: `Bearer ${data.access_token}` },
                });
                const userData = await userResponse.json();

                const hueUser = {
                    username: userData.whitelist ? Object.keys(userData.whitelist)[0] : 'user',
                    bridgeId: userData.bridgeid || 'unknown',
                };

                localStorage.setItem('hue_user', JSON.stringify(hueUser));
                setUser(hueUser);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Hue auth error:', error);
        }
    };

    const refreshToken = async () => {
        const refreshTokenValue = localStorage.getItem('hue_refresh_token');
        if (!refreshTokenValue) return;

        try {
            const response = await fetch('https://api.meethue.com/v2/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshTokenValue,
                }),
            });

            const data = await response.json();

            if (data.access_token) {
                const expiresAt = Date.now() + data.expires_in * 1000;

                localStorage.setItem('hue_access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('hue_refresh_token', data.refresh_token);
                }
                localStorage.setItem('hue_expires_at', expiresAt.toString());

                setAccessToken(data.access_token);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            logout();
        }
    };

    const logout = () => {
        localStorage.removeItem('hue_access_token');
        localStorage.removeItem('hue_refresh_token');
        localStorage.removeItem('hue_expires_at');
        localStorage.removeItem('hue_user');
        localStorage.removeItem('hue_oauth_state');

        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <HueAuthContext.Provider value={{ isAuthenticated, user, accessToken, login, logout }}>
            {children}
        </HueAuthContext.Provider>
    );
}

export function useHueAuth() {
    const context = useContext(HueAuthContext);
    if (!context) {
        throw new Error('useHueAuth must be used within HueAuthProvider');
    }
    return context;
}
