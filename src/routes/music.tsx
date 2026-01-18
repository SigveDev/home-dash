import { createFileRoute, redirect } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Sidebar } from '@/components/Sidebar'
import { useSpotifyAuth } from '@/context/SpotifyAuthContext'
import { SpotifyService } from '@/lib/spotify'
import { useEffect, useState } from 'react'
import { Play, Pause, SkipForward, SkipBack, Music2, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/music')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: MusicPage,
})

function MusicPage() {
  const { isAuthenticated, user } = useSpotifyAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [view, setView] = useState<'playlists' | 'tracks' | 'queue'>('playlists');

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
      loadNowPlaying();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(loadNowPlaying, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadPlaylists = async () => {
    const data = await SpotifyService.getPlaylists();
    setPlaylists(data);
  };

  const loadNowPlaying = async () => {
    const state = await SpotifyService.getPlaybackState();
    setNowPlaying(state);
  };

  const loadPlaylistTracks = async (playlistId: string, playlist: any) => {
    setSelectedPlaylist(playlist);
    const data = await SpotifyService.getPlaylistTracks(playlistId);
    setTracks(data);
    setView('tracks');
  };

  const loadQueue = async () => {
    const data = await SpotifyService.getQueue();
    setQueue(data);
    setView('queue');
  };

  const playTrack = async (uri: string, contextUri?: string) => {
    await SpotifyService.playTrack(uri, contextUri);
    setTimeout(loadNowPlaying, 500);
  };

  const togglePlayback = async () => {
    if (nowPlaying?.is_playing) {
      await SpotifyService.pause();
    } else {
      await SpotifyService.play();
    }
    setTimeout(loadNowPlaying, 300);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-zinc-950 text-foreground">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Music2 className="size-20 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Spotify</h2>
            <p className="text-zinc-400 mb-6">Please connect your Spotify account in Settings to use this feature.</p>
            <Button onClick={() => window.location.href = '/settings'} className="bg-green-500 hover:bg-green-600">
              Go to Settings
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Music</h1>
              <p className="text-zinc-400">Logged in as {user?.display_name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === 'playlists' ? 'default' : 'outline'}
                onClick={() => setView('playlists')}
                className={view === 'playlists' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                Playlists
              </Button>
              <Button
                variant={view === 'queue' ? 'default' : 'outline'}
                onClick={loadQueue}
                className={view === 'queue' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                <List className="size-4 mr-2" /> Queue
              </Button>
            </div>
          </div>

          {/* Now Playing Bar */}
          {nowPlaying?.item && (
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/20 flex items-center gap-6">
              <img
                src={nowPlaying.item.album.images[0]?.url}
                className="size-24 rounded-xl shadow-lg"
                alt="Album art"
              />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{nowPlaying.item.name}</h3>
                <p className="text-zinc-300">{nowPlaying.item.artists.map((a: any) => a.name).join(', ')}</p>
                <p className="text-sm text-zinc-500">{nowPlaying.item.album.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => SpotifyService.previous()}
                >
                  <SkipBack className="size-6" />
                </Button>
                <Button
                  size="icon"
                  className="size-14 bg-white text-black hover:bg-zinc-200"
                  onClick={togglePlayback}
                >
                  {nowPlaying.is_playing ? (
                    <Pause className="size-7 fill-current" />
                  ) : (
                    <Play className="size-7 fill-current ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => SpotifyService.next()}
                >
                  <SkipForward className="size-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Playlists View */}
          {view === 'playlists' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => loadPlaylistTracks(playlist.id, playlist)}
                  className="group text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <img
                    src={playlist.images[0]?.url || '/placeholder.png'}
                    className="w-full aspect-square rounded-xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow"
                    alt={playlist.name}
                  />
                  <h3 className="font-bold text-white truncate">{playlist.name}</h3>
                  <p className="text-sm text-zinc-500 truncate">{playlist.tracks.total} tracks</p>
                </button>
              ))}
            </div>
          )}

          {/* Tracks View */}
          {view === 'tracks' && selectedPlaylist && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => setView('playlists')}>
                  ← Back
                </Button>
                <h2 className="text-2xl font-bold text-white">{selectedPlaylist.name}</h2>
              </div>
              <div className="space-y-2">
                {tracks.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => playTrack(item.track.uri, selectedPlaylist.uri)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                  >
                    <img
                      src={item.track.album.images[0]?.url}
                      className="size-16 rounded-lg"
                      alt="Album art"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white group-hover:text-green-400 transition-colors">
                        {item.track.name}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {item.track.artists.map((a: any) => a.name).join(', ')}
                      </div>
                    </div>
                    <Play className="size-5 text-zinc-600 group-hover:text-green-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Queue View */}
          {view === 'queue' && queue && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Queue</h2>
              <div className="space-y-2">
                {queue.currently_playing && (
                  <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30">
                    <div className="text-xs text-green-400 mb-2">NOW PLAYING</div>
                    <div className="flex items-center gap-4">
                      <img
                        src={queue.currently_playing.album.images[0]?.url}
                        className="size-16 rounded-lg"
                        alt="Album art"
                      />
                      <div>
                        <div className="font-medium text-white">{queue.currently_playing.name}</div>
                        <div className="text-sm text-zinc-400">
                          {queue.currently_playing.artists.map((a: any) => a.name).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {queue.queue?.map((track: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800"
                  >
                    <img
                      src={track.album.images[0]?.url}
                      className="size-16 rounded-lg"
                      alt="Album art"
                    />
                    <div>
                      <div className="font-medium text-white">{track.name}</div>
                      <div className="text-sm text-zinc-500">
                        {track.artists.map((a: any) => a.name).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
