// Philips Hue Remote API Service
// Uses tokens from HueAuthContext

let cachedToken: string | null = null;

export function setHueToken(token: string | null) {
    cachedToken = token;
}

async function getToken(): Promise<string> {
    if (!cachedToken) {
        throw new Error('Hue not authenticated. Please connect Hue in Settings.');
    }
    return cachedToken;
}

export interface HueLight {
    id: string;
    id_v1: string;
    owner: {
        rid: string;
        rtype: string;
    };
    metadata: {
        name: string;
        archetype: string;
    };
    on: {
        on: boolean;
    };
    dimming?: {
        brightness: number; // 0-100
    };
    color_temperature?: {
        mirek: number;
    };
    color?: {
        xy: {
            x: number;
            y: number;
        };
    };
    type: string;
}

export interface HueRoom {
    id: string;
    id_v1: string;
    children: Array<{
        rid: string;
        rtype: string;
    }>;
    metadata: {
        name: string;
        archetype: string;
    };
    type: string;
}

export class HueService {
    static async listLights(): Promise<HueLight[]> {
        try {
            const token = await getToken();
            const res = await fetch('https://api.meethue.com/route/clip/v2/resource/light', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'hue-application-key': token
                },
            });

            if (!res.ok) {
                console.error('[Hue] List lights failed:', res.status);
                return [];
            }

            const data = await res.json();
            return data.data || [];
        } catch (e) {
            console.error('[Hue] List lights error:', e);
            return [];
        }
    }

    static async listRooms(): Promise<HueRoom[]> {
        try {
            const token = await getToken();
            const res = await fetch('https://api.meethue.com/route/clip/v2/resource/room', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'hue-application-key': token
                },
            });

            if (!res.ok) {
                console.error('[Hue] List rooms failed:', res.status);
                return [];
            }

            const data = await res.json();
            return data.data || [];
        } catch (e) {
            console.error('[Hue] List rooms error:', e);
            return [];
        }
    }

    static async setLightState(lightId: string, state: {
        on?: boolean;
        brightness?: number; // 0-100
        color?: { x: number; y: number };
    }) {
        try {
            const token = await getToken();

            const body: any = {};

            if (state.on !== undefined) {
                body.on = { on: state.on };
            }

            if (state.brightness !== undefined) {
                body.dimming = { brightness: state.brightness };
            }

            if (state.color) {
                body.color = { xy: state.color };
            }

            const res = await fetch(`https://api.meethue.com/route/clip/v2/resource/light/${lightId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'hue-application-key': token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                console.error('[Hue] Set light state failed:', res.status);
                return false;
            }

            return true;
        } catch (e) {
            console.error('[Hue] Set light state error:', e);
            return false;
        }
    }

    static async toggleLight(lightId: string, currentState: boolean) {
        return await this.setLightState(lightId, { on: !currentState });
    }

    static async setBrightness(lightId: string, brightness: number) {
        return await this.setLightState(lightId, { brightness });
    }

    static async setRoomState(roomId: string, state: {
        on?: boolean;
        brightness?: number;
    }) {
        try {
            const token = await getToken();

            const body: any = {};

            if (state.on !== undefined) {
                body.on = { on: state.on };
            }

            if (state.brightness !== undefined) {
                body.dimming = { brightness: state.brightness };
            }

            const res = await fetch(`https://api.meethue.com/route/clip/v2/resource/grouped_light/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'hue-application-key': token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                console.error('[Hue] Set room state failed:', res.status);
                return false;
            }

            return true;
        } catch (e) {
            console.error('[Hue] Set room state error:', e);
            return false;
        }
    }
}
