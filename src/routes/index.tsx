import { createFileRoute, redirect } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Sidebar } from '@/components/Sidebar'
import { WeatherWidget } from '@/components/WeatherWidget'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useSettings } from '@/context/SettingsContext'
import { useSpotifyAuth } from '@/context/SpotifyAuthContext'
import { useHueAuth } from '@/context/HueAuthContext'
import { useEffect, useState } from 'react'
import { Sun, Moon, Bus, Play, Pause, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RuterService } from '@/lib/ruter'
import { SpotifyService, setSpotifyToken } from '@/lib/spotify'
import { HueService, setHueToken } from '@/lib/hue'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/')({
    beforeLoad: async () => {
        try {
            await account.get()
        } catch {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: Dashboard,
})

function Dashboard() {
    const { settings } = useSettings();
    const { accessToken } = useSpotifyAuth();
    const { accessToken: hueAccessToken } = useHueAuth();
    const [activeLights, setActiveLights] = useState(0);
    const [nextDeparture, setNextDeparture] = useState<any>(null);
    const [nowPlaying, setNowPlaying] = useState<any>(null);

    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    if (hour >= 17) greeting = "Good evening";

    // Revert to strict black/zinc theme as requested
    const bgClass = "bg-zinc-950";

    // Sync Spotify token
    useEffect(() => {
        setSpotifyToken(accessToken);
    }, [accessToken]);

    useEffect(() => {
        async function fetchData() {
            // Hue Lights
            if (hueAccessToken) {
                try {
                    setHueToken(hueAccessToken);
                    const lights = await HueService.listLights();
                    const onCount = lights.filter(l => l.on.on).length;
                    setActiveLights(onCount);
                } catch (e) { console.error(e) }
            }

            // Ruter (Favorite or First saved stop)
            if (settings.ruterStops.length > 0) {
                const stopId = settings.favoriteStopId || settings.ruterStops[0].id;
                try {
                    const deps = await RuterService.getDepartures(stopId, 1);
                    if (deps.length > 0) {
                        const stopName = settings.ruterStops.find(s => s.id === stopId)?.name || 'Unknown Stop';
                        setNextDeparture({ ...deps[0], stopName });
                    }
                } catch (e) {
                    console.error("Dashboard Ruter Error", e);
                }
            }

            // Spotify
            try {
                const spotifyState = await SpotifyService.getPlaybackState();
                setNowPlaying(spotifyState);
            } catch (e) { console.error("Spotify Dashboard Error", e) }
        }
        fetchData();

        // Refresh Spotify often, Ruter less often
        const sInt = setInterval(async () => {
            try {
                setNowPlaying(await SpotifyService.getPlaybackState());
            } catch { }
        }, 5000);

        return () => clearInterval(sInt);
    }, [settings]);

    const toggleSpotify = async () => {
        try {
            if (nowPlaying?.is_playing) await SpotifyService.pause();
            else await SpotifyService.play();
        } catch (e) { console.error("Spotify Control Error", e) }
    };

    return (
        <div className={cn("flex min-h-screen text-foreground transition-colors", bgClass)}>
            <Sidebar />
            <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">
                <header className="mb-10 flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight text-white">{greeting}, User</h1>
                        <p className="text-zinc-400 text-lg">Welcome back to your home controller.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                            <div className={cn("size-2 rounded-full animate-pulse", activeLights > 0 ? "bg-amber-500" : "bg-zinc-600")} />
                            <span className="text-sm font-medium text-zinc-300">
                                {activeLights === 0 ? "All lights off" : `${activeLights} lights on`}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[minmax(180px,auto)]">
                    {/* Weather Widget (Span 2) */}
                    <div className="col-span-1 md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-xl transition-all hover:bg-zinc-900/60 hover:border-white/10">
                        <h2 className="text-lg font-medium mb-4 text-zinc-300 relative z-10 flex items-center gap-2">
                            <Sun className="size-4" /> Weather
                        </h2>
                        <div className="relative z-10 h-[calc(100%-2rem)]">
                            <WeatherWidget />
                        </div>
                    </div>

                    {/* Calendar Widget (Span 2, Row 2) */}
                    <div className="col-span-1 md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-xl transition-all hover:bg-zinc-900/60 hover:border-white/10">
                        <h2 className="text-lg font-medium mb-4 text-zinc-300 relative z-10 flex items-center gap-2">
                            <span className="font-bold text-red-400">{new Date().getDate()}</span> Schedule
                        </h2>
                        <div className="relative z-10 h-[calc(100%-2rem)]">
                            <CalendarWidget />
                        </div>
                    </div>

                    {/* Quick Actions / Home Status */}
                    <div className="col-span-1 rounded-3xl bg-zinc-900/40 border border-white/5 p-6 backdrop-blur-xl flex flex-col justify-between group hover:border-white/10 transition-colors">
                        <div>
                            <h2 className="text-lg font-medium mb-2 text-zinc-300">Home Status</h2>
                            <div className="flex items-center gap-2 text-3xl font-bold text-white">
                                {activeLights > 0 ? <Sun className="size-8 text-amber-500" /> : <Moon className="size-8 text-zinc-600" />}
                                <span>{activeLights > 0 ? "Active" : "Quiet"}</span>
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-zinc-500">
                            {activeLights} devices currently running.
                        </div>
                    </div>

                    {/* Ruter (Next Departure) */}
                    <div className="col-span-1 rounded-3xl bg-red-500/10 border border-red-500/10 p-6 backdrop-blur-xl hover:border-red-500/20 transition-colors relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Bus className="size-20 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium mb-2 text-red-200">Next Departure</h2>
                            {nextDeparture ? (
                                <div>
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {formatDistanceToNow(new Date(nextDeparture.expectedDepartureTime))}
                                    </div>
                                    <div className="text-red-300 font-medium truncate">
                                        {nextDeparture.destinationDisplay.frontText}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-sm text-red-400/60">
                                        <span className="bg-red-500/20 px-2 py-0.5 rounded text-red-300 font-bold">
                                            {nextDeparture.serviceJourney.journeyPattern.line.publicCode}
                                        </span>
                                        <span>{nextDeparture.stopName}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-red-400/50">No upcoming departures or no stop selected.</div>
                            )}
                        </div>
                    </div>

                    {/* Spotify Now Playing */}
                    <div className="col-span-1 md:col-span-2 rounded-3xl bg-green-500/10 border border-green-500/10 p-6 backdrop-blur-xl hover:border-green-500/20 transition-colors flex items-center gap-6 relative overflow-hidden">
                        {/* Background Art */}
                        {nowPlaying?.item?.album?.images?.[0]?.url && (
                            <div className="absolute inset-0">
                                <img src={nowPlaying.item.album.images[0].url} className="w-full h-full object-cover blur-md opacity-20" />
                            </div>
                        )}

                        <div className="relative z-10 size-24 rounded-2xl bg-black/50 overflow-hidden shrink-0 shadow-lg">
                            {nowPlaying?.item?.album?.images?.[0]?.url && (
                                <img src={nowPlaying.item.album.images[0].url} className="w-full h-full object-cover" />
                            )}
                        </div>

                        <div className="relative z-10 flex-1 min-w-0">
                            <h3 className="text-white font-bold text-xl truncate">{nowPlaying?.item?.name || "Not Playing"}</h3>
                            <p className="text-green-200 truncate mb-4">{nowPlaying?.item?.artists?.map((a: any) => a.name).join(', ')}</p>

                            <div className="flex items-center gap-4">
                                <button className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform" onClick={toggleSpotify}>
                                    {nowPlaying?.is_playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
                                </button>
                                <button className="text-green-200 hover:text-white" onClick={() => SpotifyService.next()}>
                                    <SkipForward className="size-6 fill-current" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
