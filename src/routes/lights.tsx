import { createFileRoute, redirect } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Sidebar } from '@/components/Sidebar'
import { useHueAuth } from '@/context/HueAuthContext'
import { HueService, setHueToken, type HueLight, type HueRoom } from '@/lib/hue'
import { useEffect, useState } from 'react'
import { Lightbulb, AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/lights')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: LightsPage,
})

interface RoomWithLights {
  room: HueRoom;
  lights: HueLight[];
}

function LightsPage() {
  const { isAuthenticated, accessToken } = useHueAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomWithLights[]>([]);
  // @ts-ignore
  const [allLights, setAllLights] = useState<HueLight[]>([]);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  // Sync Hue token
  useEffect(() => {
    setHueToken(accessToken);
  }, [accessToken]);

  async function fetchLights() {
    setLoading(true);
    setError(null);
    try {
      const [lights, roomsData] = await Promise.all([
        HueService.listLights(),
        HueService.listRooms()
      ]);

      setAllLights(lights);

      // Group lights by room
      const roomsWithLights: RoomWithLights[] = roomsData.map(room => ({
        room,
        lights: lights.filter(light =>
          room.children.some(child => child.rid === light.id)
        )
      })).filter(r => r.lights.length > 0);

      // Add "All Lights" room
      if (lights.length > 0) {
        roomsWithLights.unshift({
          room: {
            id: 'all',
            id_v1: '',
            children: [],
            metadata: { name: 'All Lights', archetype: 'other' },
            type: 'room'
          },
          lights
        });
      }

      setRooms(roomsWithLights);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchLights();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const toggleLight = async (light: HueLight) => {
    await HueService.toggleLight(light.id, light.on.on);
    // Optimistic update
    setAllLights(prev => prev.map(l =>
      l.id === light.id ? { ...l, on: { on: !l.on.on } } : l
    ));
    setTimeout(fetchLights, 500);
  };

  const setBrightness = async (light: HueLight, brightness: number) => {
    await HueService.setBrightness(light.id, brightness);
    setTimeout(fetchLights, 300);
  };

  const toggleRoom = async (room: RoomWithLights, state: boolean) => {
    if (room.room.id === 'all') {
      // Toggle all lights
      await Promise.all(room.lights.map(l =>
        HueService.setLightState(l.id, { on: state })
      ));
    } else {
      // Use room control
      await HueService.setRoomState(room.room.id, { on: state });
    }
    setTimeout(fetchLights, 500);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-zinc-950 text-foreground">
        <Sidebar />
        <main className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="size-12 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Philips Hue Not Connected</h1>
          <p className="text-zinc-400 mb-6 max-w-md">
            Please go to Settings and connect your Philips Hue account to control your lights.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-hidden flex flex-col h-screen">
        <header className="flex items-center justify-between mb-8 shrink-0">
          <h1 className="text-3xl font-bold text-white">Lights</h1>
          <Button variant="ghost" size="icon" onClick={fetchLights} disabled={loading}>
            <RefreshCcw className={cn("size-5", loading && "animate-spin")} />
          </Button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 mb-6 shrink-0">
            Error: {error}
          </div>
        )}

        {/* Room Selector */}
        <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 custom-scrollbar">
          {rooms.map((room, idx) => (
            <button
              key={room.room.id}
              onClick={() => setSelectedRoomIndex(idx)}
              className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all min-w-[160px]",
                selectedRoomIndex === idx
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <div className={cn("size-2 rounded-full", selectedRoomIndex === idx ? "bg-amber-500" : "bg-zinc-600")} />
              <span className="font-medium whitespace-nowrap">{room.room.metadata.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Room Content */}
        {rooms.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex items-center justify-between mb-6 shrink-0 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
              <div>
                <h2 className="text-2xl font-bold text-white">{rooms[selectedRoomIndex].room.metadata.name}</h2>
                <p className="text-zinc-500 text-sm">{rooms[selectedRoomIndex].lights.length} Lights</p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-zinc-800 text-white" onClick={() => toggleRoom(rooms[selectedRoomIndex], false)}>Off</Button>
                <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => toggleRoom(rooms[selectedRoomIndex], true)}>On</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20 custom-scrollbar">
              {rooms[selectedRoomIndex].lights.map(light => {
                const isOn = light.on.on;
                const brightness = light.dimming?.brightness || 100;

                return (
                  <div key={light.id} className={cn(
                    "p-6 rounded-3xl border transition-all flex flex-col justify-between min-h-[200px] group relative overflow-hidden",
                    isOn
                      ? "bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  )}>
                    <div className="flex justify-between items-start z-10" onClick={() => toggleLight(light)}>
                      <div className={cn(
                        "size-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                        isOn ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-zinc-800 text-zinc-500"
                      )}>
                        <Lightbulb className="size-5 fill-current" />
                      </div>
                    </div>

                    <div className="z-10 space-y-3">
                      <div>
                        <h3 className={cn("font-medium text-lg leading-tight mb-1", isOn ? "text-amber-100" : "text-zinc-300")}>
                          {light.metadata.name}
                        </h3>
                        <p className="text-sm text-zinc-500 capitalize">{light.metadata.archetype}</p>
                      </div>

                      {/* Brightness Slider */}
                      {isOn && light.dimming && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-zinc-400">
                            <span>Brightness</span>
                            <span>{Math.round(brightness)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={brightness}
                            onChange={(e) => setBrightness(light, parseInt(e.target.value))}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Glow effect */}
                    {isOn && <div className="absolute -bottom-10 -right-10 size-40 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {rooms.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            No lights found. Make sure your Hue Bridge is connected.
          </div>
        )}
      </main>
    </div>
  )
}
