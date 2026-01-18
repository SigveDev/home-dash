import { createFileRoute } from '@tanstack/react-router'
import { account } from '@/lib/appwrite'
import { Button } from '@/components/ui/button'
import { OAuthProvider } from 'appwrite'

export const Route = createFileRoute('/login')({
    component: Login,
})

function Login() {
    const handleLogin = () => {
        account.createOAuth2Session(
            OAuthProvider.Google,
            window.location.origin, // Success URL (redirect back to home)
            window.location.origin + '/login', // Failure URL
            ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/sdm.service']
        )
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-sm space-y-8 text-center bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Home Dash</h1>
                    <p className="text-zinc-400">Manage your home with ease.</p>
                </div>
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-lg font-medium border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300"
                    onClick={handleLogin}
                >
                    Login with Google
                </Button>
            </div>
        </div>
    )
}
