import { account } from "@/lib/appwrite";

interface SmartDevice {
    name: string; // The resource name (enterprises/XXX/devices/YYY)
    type: string; // sdm.devices.types.LIGHT, etc.
    traits: Record<string, any>;
    parentRelations: {
        parent: string; // enterprises/XXX/structures/YYY/rooms/ZZZ
        displayName: string; // "Living Room"
    }[];
}

const BASE_URL = "https://smartdevicemanagement.googleapis.com/v1";

export class GoogleSDM {
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
    }

    private async getToken() {
        const session = await account.getSession("current");
        return session.providerAccessToken;
    }

    async listDevices(): Promise<SmartDevice[]> {
        const token = await this.getToken();
        if (!this.projectId) throw new Error("Google Device Access Project ID not configured");

        console.log(`[SDM] Fetching devices for project: ${this.projectId}`);

        const res = await fetch(`${BASE_URL}/enterprises/${this.projectId}/devices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("[SDM] List Devices failed", res.status, text);
            throw new Error(`Failed to list devices: ${res.status} ${text}`);
        }

        const data = await res.json();
        console.log("[SDM] Devices found:", data.devices?.length || 0);
        return data.devices || [];
    }

    async executeCommand(deviceId: string, command: string, params: object = {}) {
        const token = await this.getToken();

        const res = await fetch(`${BASE_URL}/${deviceId}:executeCommand`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                params: params
            })
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("[SDM] Command failed", res.status, text);
            throw new Error(`Failed to execute command: ${text}`);
        }

        return await res.json();
    }
}
