import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { account } from "@/lib/appwrite";
import { useSettings } from "@/context/SettingsContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, addWeeks, subMonths, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/calendar')({
  beforeLoad: async () => {
    try {
      await account.get()
    } catch {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: CalendarPage,
})

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
}

export function CalendarPage() {
  const { settings } = useSettings();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const session = await account.getSession("current");
        const token = session.providerAccessToken;

        if (!token) {
          console.error("No provider token found in session. Please re-login.");
          return;
        }

        let timeMin, timeMax;

        if (view === 'month') {
          timeMin = startOfMonth(currentDate).toISOString();
          timeMax = endOfMonth(currentDate).toISOString();
        } else {
          timeMin = startOfWeek(currentDate).toISOString();
          timeMax = endOfWeek(currentDate).toISOString();
        }

        console.log(`Fetching Calendar: ${view} view`, { timeMin, timeMax });

        // Fetch events from all selected calendars
        const calendarIds = settings.calendarIds || ['primary'];
        const allEvents: CalendarEvent[] = [];

        for (const calendarId of calendarIds) {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
            `singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const data = await res.json();
            if (data.items) {
              allEvents.push(...data.items);
            }
          } else if (res.status === 401) {
            alert("Calendar session expired. Please logout and login again.");
            return;
          }
        }

        // Sort all events by start time
        allEvents.sort((a, b) => {
          const aTime = new Date(a.start.dateTime || a.start.date!).getTime();
          const bTime = new Date(b.start.dateTime || b.start.date!).getTime();
          return aTime - bTime;
        });

        setEvents(allEvents);
      } catch (e) {
        console.error(e);
      }
    }
    fetchCalendar();
  }, [currentDate, view, settings.calendarIds]);

  const navigate = (dir: number) => {
    if (view === 'month') {
      setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const days = view === 'month'
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) })
    : eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });

  return (
    <div className="flex min-h-screen bg-zinc-950 text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto flex flex-col h-screen">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setView('month')}
                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", view === 'month' ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white")}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", view === 'week' ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white")}
              >
                Week
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col flex-1 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={i} className="p-3 text-center text-sm font-medium text-zinc-400">
                {d}
              </div>
            ))}
          </div>
          <div className={cn("grid grid-cols-7 flex-1 bg-zinc-800 gap-px", view === 'month' ? "auto-rows-fr" : "h-full")}>
            {days.map((day) => {
              const isTodayLocal = isSameDay(day, new Date());
              const isCurrentMont = isSameMonth(day, currentDate);

              const dayEvents = events.filter(e => {
                const start = e.start.dateTime || e.start.date;
                return start?.startsWith(format(day, 'yyyy-MM-dd'));
              });

              return (
                <div key={day.toISOString()} className={cn(
                  "bg-zinc-950 p-2 min-h-[100px] flex flex-col group relative transition-colors hover:bg-zinc-900/80",
                  !isCurrentMont && "bg-zinc-950/50 text-zinc-600"
                )}>
                  <span className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-2",
                    isTodayLocal ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-zinc-400"
                  )}>
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1">
                    {dayEvents.map(e => (
                      <div key={e.id} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/5 text-zinc-300 truncate hover:bg-white/10 cursor-default" title={e.summary}>
                        {e.summary}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}
