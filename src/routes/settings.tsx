import { createFileRoute, redirect } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Sidebar } from '@/components/Sidebar'
import { useSettings } from '@/context/SettingsContext'
import { useSpotifyAuth } from '@/context/SpotifyAuthContext'
import { useHueAuth } from '@/context/HueAuthContext'
import { Button } from '@/components/ui/button'
import { MapPin, Bus, Search, Plus, Trash2, Star, Check, Lightbulb, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { RuterService, type RuterStop } from '@/lib/ruter'
import { setSpotifyToken } from '@/lib/spotify'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { settings, updateSettings, loading } = useSettings();
  const { isAuthenticated: spotifyAuth, user: spotifyUser, login: spotifyLogin, logout: spotifyLogout, accessToken } = useSpotifyAuth();
  const { isAuthenticated: hueAuth, user: hueUser, login: hueLogin, logout: hueLogout } = useHueAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isServing, setIsServing] = useState(false);

  // Ruter Search State
  const [stopQuery, setStopQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RuterStop[]>([]);
  const [searching, setSearching] = useState(false);

  // Google Calendars
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Set Spotify token for service layer
  useEffect(() => {
    setSpotifyToken(accessToken);
  }, [accessToken]);

  // Load Google Calendars
  useEffect(() => {
    async function fetchCalendars() {
      setLoadingCalendars(true);
      try {
        const session = await account.getSession('current');
        const token = session.providerAccessToken;

        const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setGoogleCalendars(data.items || []);
        }
      } catch (e) {
        console.error('Failed to load calendars:', e);
      } finally {
        setLoadingCalendars(false);
      }
    }

    fetchCalendars();
  }, []);

  // Removed Google SDM device loading - now using Philips Hue

  const handleSave = async () => {
    setIsServing(true);
    await updateSettings(localSettings);
    setIsServing(false);
  };

  const searchStops = async () => {
    if (stopQuery.length < 3) return;
    setSearching(true);
    const results = await RuterService.searchStops(stopQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const addStop = (stop: RuterStop) => {
    if (localSettings.ruterStops.some(s => s.id === stop.id)) return;

    setLocalSettings(prev => ({
      ...prev,
      ruterStops: [...(prev.ruterStops || []), { id: stop.id, name: stop.name }]
    }));
    setSearchResults([]);
    setStopQuery("");
  };

  const removeStop = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      ruterStops: prev.ruterStops.filter(s => s.id !== id)
    }));
  };

  const toggleCalendar = (calendarId: string) => {
    setLocalSettings(prev => {
      const selected = prev.calendarIds || [];
      const isSelected = selected.includes(calendarId);

      return {
        ...prev,
        calendarIds: isSelected
          ? selected.filter(id => id !== calendarId)
          : [...selected, calendarId]
      };
    });
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-8 pb-20">
          {/* Weather Settings */}
          <section className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <MapPin className="size-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Weather Location</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={localSettings.weatherLocation.lat}
                  onChange={e => setLocalSettings(prev => ({
                    ...prev,
                    weatherLocation: { ...prev.weatherLocation, lat: parseFloat(e.target.value) }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={localSettings.weatherLocation.lon}
                  onChange={e => setLocalSettings(prev => ({
                    ...prev,
                    weatherLocation: { ...prev.weatherLocation, lon: parseFloat(e.target.value) }
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-zinc-400">Location Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={localSettings.weatherLocation.name}
                  onChange={e => setLocalSettings(prev => ({
                    ...prev,
                    weatherLocation: { ...prev.weatherLocation, name: e.target.value }
                  }))}
                />
              </div>
            </div>
          </section>

          {/* Google Calendar Settings */}
          <section className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Calendar className="size-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Google Calendars</h2>
            </div>
            <div className="space-y-4">
              {loadingCalendars ? (
                <div className="text-zinc-500 text-sm p-2">Loading calendars...</div>
              ) : googleCalendars.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Select Calendars to Display</label>
                  {googleCalendars.map(calendar => {
                    const isSelected = (localSettings.calendarIds || []).includes(calendar.id);

                    return (
                      <button
                        key={calendar.id}
                        onClick={() => toggleCalendar(calendar.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${isSelected
                          ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-4 rounded-full"
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          <div>
                            <div className="font-medium">{calendar.summary}</div>
                            {calendar.description && (
                              <div className="text-xs opacity-60">{calendar.description}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="size-5" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm p-2">
                  No calendars found. Make sure you're logged in with Google.
                </div>
              )}
            </div>
          </section>

          {/* Philips Hue Settings */}
          <section className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lightbulb className="size-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Philips Hue</h2>
            </div>
            <div className="space-y-4">
              {hueAuth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div>
                      <div className="text-white font-medium">Connected to Hue Bridge</div>
                      <div className="text-sm text-amber-300">Bridge ID: {hueUser?.bridgeId}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                      onClick={hueLogout}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={hueLogin}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-6"
                >
                  <Lightbulb className="size-5 mr-2" />
                  Connect Philips Hue
                </Button>
              )}
            </div>
          </section>

          {/* Ruter Settings */}
          <section className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <Bus className="size-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Public Transport (Ruter/EnTur)</h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for stops (e.g. Jernbanetorget)"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
                  value={stopQuery}
                  onChange={(e) => setStopQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchStops()}
                />
                <Button onClick={searchStops} disabled={searching} className="bg-zinc-800 text-white hover:bg-zinc-700">
                  <Search className="size-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {searchResults.map(stop => (
                    <div key={stop.id} className="p-3 border-b border-zinc-800 hover:bg-zinc-900 flex justify-between items-center group">
                      <span className="text-sm text-zinc-300">{stop.name}</span>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100" onClick={() => addStop(stop)}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-zinc-400">Saved Stops</label>
                {(localSettings.ruterStops || []).map(stop => (
                  <div key={stop.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={localSettings.favoriteStopId === stop.id ? "text-yellow-500 hover:text-yellow-600" : "text-zinc-600 hover:text-yellow-500"}
                        onClick={() => setLocalSettings(prev => ({ ...prev, favoriteStopId: stop.id }))}
                      >
                        <Star className="size-4 fill-current" />
                      </Button>
                      <span className="text-white">{stop.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-red-500" onClick={() => removeStop(stop.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Spotify Settings */}
          <section className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Spotify</h2>
            </div>

            <div className="space-y-4">
              {spotifyAuth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div>
                      <div className="text-white font-medium">{spotifyUser?.display_name}</div>
                      <div className="text-sm text-green-300">{spotifyUser?.email}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                      onClick={spotifyLogout}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={spotifyLogin}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-6"
                >
                  <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Connect Spotify Account
                </Button>
              )}
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-4 sticky bottom-8">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isServing}
              className="bg-white text-black hover:bg-zinc-200 shadow-xl"
            >
              {isServing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
