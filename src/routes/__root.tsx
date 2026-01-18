import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
    component: () => (
        <>
            <div className="flex flex-col min-h-screen bg-background text-foreground antialiased font-sans">
                <Outlet />
            </div>
            <TanStackRouterDevtools />
        </>
    ),
})
