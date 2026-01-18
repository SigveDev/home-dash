import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { account } from "@/lib/appwrite";
import { useSettings } from "@/context/SettingsContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wind, Droplets, CloudRain, Sun, Cloud, CloudSnow, CloudLightning } from "lucide-react";
import { format } from 'date-fns';

export const Route = createFileRoute('/weather')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: WeatherPage,
})

interface WeatherData {
  properties: {
    timeseries: {
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            wind_speed: number;
            relative_humidity: number;
            precipitation_amount?: number;
          };
        };
        next_1_hours?: {
          summary: { symbol_code: string };
          details?: { precipitation_amount: number };
        };
        next_6_hours?: {
          summary: { symbol_code: string };
        };
      };
    }[];
  };
}

function WeatherIcon({ code, className }: { code?: string, className?: string }) {
  if (!code) return <Sun className={className} />;
  if (code.includes('rain')) return <CloudRain className={className} />;
  if (code.includes('snow')) return <CloudSnow className={className} />;
  if (code.includes('lightning')) return <CloudLightning className={className} />;
  if (code.includes('cloud')) return <Cloud className={className} />;
  return <Sun className={className} />;
}

export function WeatherPage() {
  const { settings } = useSettings();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      if (!settings.weatherLocation.lat) return;

      try {
        const res = await fetch(
          `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${settings.weatherLocation.lat}&lon=${settings.weatherLocation.lon}`,
          { headers: { "User-Agent": "HomeDash/1.0" } }
        );
        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();
        setWeather(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [settings.weatherLocation]);

  if (loading || !weather) return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-zinc-500">Loading forecast...</div>
    </div>
  );

  const current = weather.properties.timeseries[0];
  // Next 24 hours for graph
  const forecast24h = weather.properties.timeseries.slice(0, 24).map(p => ({
    time: format(new Date(p.time), 'HH:mm'),
    temp: p.data.instant.details.air_temperature,
    rain: p.data.next_1_hours?.details?.precipitation_amount || 0
  }));

  // Daily forecast (every 24h roughly, picking noon)
  const daily = weather.properties.timeseries.filter(p => p.time.includes("12:00:00")).slice(0, 5);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{settings.weatherLocation.name || "My Location"}</h1>
            <p className="text-zinc-400">
              {format(new Date(), 'EEEE, MMMM do')} | {current.data.next_1_hours?.summary.symbol_code.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-6xl font-bold text-white tracking-tight">{current.data.instant.details.air_temperature}°</div>
          </div>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Graph Card */}
          <div className="col-span-1 lg:col-span-2 h-[400px] bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-medium text-zinc-300 mb-6">24 Hour Trend</h3>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={forecast24h}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="°" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Current Stats */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 font-medium mb-1">Wind Speed</p>
                <p className="text-2xl font-bold text-white">{current.data.instant.details.wind_speed} <span className="text-sm text-zinc-500 font-normal">m/s</span></p>
              </div>
              <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Wind className="size-6" />
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 font-medium mb-1">Humidity</p>
                <p className="text-2xl font-bold text-white">{current.data.instant.details.relative_humidity}%</p>
              </div>
              <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-blue-400">
                <Droplets className="size-6" />
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 font-medium mb-1">Precipitation</p>
                <p className="text-2xl font-bold text-white">{current.data.next_1_hours?.details?.precipitation_amount || 0} <span className="text-sm text-zinc-500 font-normal">mm</span></p>
              </div>
              <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center text-cyan-400">
                <CloudRain className="size-6" />
              </div>
            </div>
          </div>
        </div>

        {/* 5 Day Forecast */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {daily.map((day) => (
            <div key={day.time} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-3">
              <span className="text-zinc-400 font-medium">{format(new Date(day.time), 'EEE')}</span>
              <WeatherIcon code={day.data.next_6_hours?.summary.symbol_code} className="size-8 text-white" />
              <span className="text-xl font-bold text-white">{day.data.instant.details.air_temperature}°</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
