import { createContext, useContext, useEffect, useState } from "react";
import { account } from "@/lib/appwrite";

interface Settings {
    weatherLocation: { lat: number; lon: number; name: string };
    calendarIds: string[];
    sdmProjectId: string;
    selectedDeviceIds: string[]; // Google SDM device IDs to manage
    ruterStops: { id: string; name: string }[];
    favoriteStopId?: string;
    spotifyDeviceId?: string;
}

const DEFAULT_SETTINGS: Settings = {
    weatherLocation: { lat: 59.91, lon: 10.75, name: "Oslo" },
    calendarIds: ["primary"],
    sdmProjectId: "",
    selectedDeviceIds: [],
    ruterStops: [],
    favoriteStopId: "",
    spotifyDeviceId: "",
};

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSettings() {
            try {
                const user = await account.get();
                // Merge defaults with saved prefs
                const merged = { ...DEFAULT_SETTINGS, ...user.prefs };
                setSettings(merged);
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    const updateSettings = async (newSettings: Partial<Settings>) => {
        // Optimistic update
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        try {
            await account.updatePrefs(updated);
        } catch (e) {
            console.error("Failed to save settings to Appwrite", e);
            alert("Failed to save settings. Please check your network or permissions.");
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings must be used within SettingsProvider");
    return context;
}
