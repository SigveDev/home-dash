import { useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { useSettings } from "@/context/SettingsContext";
import { Calendar } from "lucide-react";

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime: string; date?: string };
    end: { dateTime: string; date?: string };
}

export function CalendarWidget() {
    const { settings } = useSettings();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchCalendar() {
            try {
                const session = await account.getSession("current");
                const token = session.providerAccessToken;

                if (!token) {
                    console.error("No provider token found in session");
                    throw new Error("No provider token");
                }

                const now = new Date();
                const timeMin = now.toISOString();
                const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

                // Fetch events from all selected calendars
                const calendarIds = settings.calendarIds || ['primary'];
                const allEvents: CalendarEvent[] = [];

                for (const calendarId of calendarIds) {
                    const res = await fetch(
                        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
                        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=10`,
                        {
                            headers: { Authorization: `Bearer ${token}` }
                        }
                    );

                    if (res.ok) {
                        const data = await res.json();
                        if (data.items) {
                            allEvents.push(...data.items);
                        }
                    }
                }

                // Sort all events by start time
                allEvents.sort((a, b) => {
                    const aTime = new Date(a.start.dateTime || a.start.date!).getTime();
                    const bTime = new Date(b.start.dateTime || b.start.date!).getTime();
                    return aTime - bTime;
                });

                setEvents(allEvents.slice(0, 5)); // Show top 5 events
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchCalendar();
    }, [settings.calendarIds]);

    if (loading) return <div className="animate-pulse text-zinc-500">Loading schedule...</div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
            <Calendar className="size-8 opacity-20" />
            <span className="text-sm">Connect Calendar</span>
        </div>
    );

    return (
        <div className="h-full space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {events.length === 0 && (
                <div className="text-zinc-500 text-sm">No upcoming events today.</div>
            )}
            {events.map(event => (
                <div key={event.id} className="flex gap-4 items-start p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex flex-col items-center min-w-[3rem]">
                        <span className="text-xs text-zinc-400 font-medium">
                            {new Date(event.start.dateTime || event.start.date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="h-full w-0.5 bg-zinc-800 my-1 rounded-full" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-zinc-200 line-clamp-1">{event.summary}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(event.start.dateTime || event.start.date!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
