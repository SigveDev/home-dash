import { useEffect, useState } from "react";
import { Wind } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface WeatherData {
    properties: {
        timeseries: {
            time: string;
            data: {
                instant: {
                    details: {
                        air_temperature: number;
                        wind_speed: number;
                    };
                };
                next_1_hours?: {
                    summary: {
                        symbol_code: string;
                    };
                };
            };
        }[];
    };
}

export function WeatherWidget() {
    const { settings } = useSettings();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchWeather() {
            if (!settings.weatherLocation.lat) return;

            try {
                const res = await fetch(
                    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${settings.weatherLocation.lat}&lon=${settings.weatherLocation.lon}`,
                    {
                        headers: {
                            "User-Agent": "HomeDash/1.0 github.com/user/home-dash",
                        },
                    }
                );
                if (!res.ok) throw new Error("Failed to fetch weather");
                const data = await res.json();
                setWeather(data);
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();
    }, [settings.weatherLocation]);

    if (loading) return <div className="animate-pulse text-zinc-500">Loading weather data...</div>;
    if (error) return <div className="text-red-400">Unavailable</div>;

    const current = weather?.properties.timeseries[0].data.instant.details;
    const symbol = weather?.properties.timeseries[0].data.next_1_hours?.summary.symbol_code;

    return (
        <div className="flex items-center justify-between h-full pb-8 px-4">
            <div className="flex flex-col">
                <span className="text-5xl font-bold text-white tracking-tighter">
                    {current?.air_temperature.toFixed(1)}°
                </span>
                <div className="flex items-center gap-2 text-zinc-400 mt-2">
                    <Wind className="size-4" />
                    <span>{current?.wind_speed} m/s</span>
                </div>
                <div className="text-xs text-zinc-500 mt-2">{settings.weatherLocation.name || "My Location"}</div>
            </div>
            <div className="text-right">
                <div className="text-zinc-300 capitalize text-lg font-medium">
                    {symbol ? symbol.replace(/_/g, ' ') : 'Unknown'}
                </div>
            </div>
        </div>
    );
}
