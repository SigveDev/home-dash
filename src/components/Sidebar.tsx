import { Link } from '@tanstack/react-router'
import { LayoutDashboard, CloudSun, CalendarDays, Lightbulb, LogOut, Settings, Bus, Music } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { Button } from '@/components/ui/button'

export function Sidebar() {
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/weather', icon: CloudSun, label: 'Weather' },
        { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
        { to: '/lights', icon: Lightbulb, label: 'Lights' },
        { to: '/transport', icon: Bus, label: 'Transport' },
        { to: '/music', icon: Music, label: 'Music' },
    ]

    const handleLogout = async () => {
        try {
            await account.deleteSession('current')
            window.location.href = '/login'
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <aside className="w-20 lg:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between h-screen shrink-0 sticky top-0">
            <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2 px-2 py-4 mb-4">
                    <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shrink-0" />
                    <span className="text-xl font-bold tracking-tight text-white hidden lg:block">Home Dash</span>
                </div>

                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all [&.active]:bg-zinc-800 [&.active]:text-white group"
                        >
                            <item.icon className="size-5 shrink-0 group-[.active]:text-blue-400" />
                            <span className="font-medium hidden lg:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-zinc-800 flex flex-col gap-1">
                <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all [&.active]:bg-zinc-800 [&.active]:text-white"
                >
                    <Settings className="size-5 shrink-0" />
                    <span className="font-medium hidden lg:block">Settings</span>
                </Link>
                <Button
                    variant="ghost"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 justify-start w-full"
                    onClick={handleLogout}
                >
                    <LogOut className="size-5 shrink-0" />
                    <span className="font-medium hidden lg:block">Logout</span>
                </Button>
            </div>
        </aside>
    )
}
