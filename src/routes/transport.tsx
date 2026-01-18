import { createFileRoute, redirect } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Sidebar } from '@/components/Sidebar'
import { useSettings } from '@/context/SettingsContext'
import { useEffect, useState } from 'react'
import { RuterService } from '@/lib/ruter'
import { Bus, Clock, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/transport')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: TransportPage,
})

interface DepartureWithStop {
  stopId: string;
  stopName: string;
  departures: any[];
}

function TransportPage() {
  const { settings } = useSettings();
  const [data, setData] = useState<DepartureWithStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDepartures() {
      setLoading(true);
      const results: DepartureWithStop[] = [];

      for (const stop of settings.ruterStops) {
        try {
          const departures = await RuterService.getDepartures(stop.id, 10);
          results.push({
            stopId: stop.id,
            stopName: stop.name,
            departures
          });
        } catch (e) {
          console.error(`Failed to fetch departures for ${stop.name}`, e);
        }
      }

      setData(results);
      setLoading(false);
    }

    if (settings.ruterStops.length > 0) {
      fetchDepartures();
      const interval = setInterval(fetchDepartures, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [settings.ruterStops]);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-red-500/10">
              <Bus className="size-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Public Transport</h1>
              <p className="text-zinc-400">Real-time departures from your saved stops</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-zinc-500">Loading departures...</div>
          ) : settings.ruterStops.length === 0 ? (
            <div className="text-center py-20">
              <Bus className="size-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No stops configured. Add stops in Settings.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.map((stopData) => (
                <section key={stopData.stopId} className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="size-5 text-red-500" />
                      <h2 className="text-2xl font-bold text-white">{stopData.stopName}</h2>
                      {settings.favoriteStopId === stopData.stopId && (
                        <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-medium">
                          Favorite
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500">
                      {stopData.departures.length} departures
                    </span>
                  </div>

                  {stopData.departures.length === 0 ? (
                    <div className="text-zinc-600 text-center py-8">No upcoming departures</div>
                  ) : (
                    <div className="space-y-3">
                      {stopData.departures.map((dep, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center size-12 rounded-lg bg-red-500/20 text-red-400 font-bold text-lg">
                              {dep.serviceJourney.journeyPattern.line.publicCode}
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-medium">
                                {dep.destinationDisplay.frontText}
                              </div>
                              <div className="text-sm text-zinc-500 capitalize">
                                {dep.serviceJourney.journeyPattern.line.transportMode}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Clock className="size-4" />
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(dep.expectedDepartureTime))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
