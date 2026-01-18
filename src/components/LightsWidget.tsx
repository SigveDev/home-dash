import { useState } from "react";
import { Lightbulb, Power } from "lucide-react";
import { auditLogger } from "@/lib/audit-logger";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LightProps {
    name: string;
    id: string;
}

export function LightsWidget({ name, id }: LightProps) {
    const [isOn, setIsOn] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggleLight = async () => {
        setLoading(true);
        const newState = !isOn;
        setIsOn(newState); // Optimistic update

        try {
            // Simulate API call to Google Home
            await new Promise(resolve => setTimeout(resolve, 500));

            await auditLogger.log("light_control", {
                device_id: id,
                device_name: name,
                action: newState ? "on" : "off"
            });

        } catch (error) {
            console.error("Failed to toggle light", error);
            setIsOn(!newState); // Revert
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
                <div className={cn(
                    "p-3 rounded-full transition-colors duration-500",
                    isOn ? "bg-amber-400/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]" : "bg-zinc-800 text-zinc-500"
                )}>
                    <Lightbulb className={cn("size-6", isOn && "fill-amber-400")} />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleLight}
                    disabled={loading}
                    className={cn(
                        "rounded-full hover:bg-white/10 active:scale-95 transition-all text-zinc-400",
                        isOn && "text-white"
                    )}
                >
                    <Power className="size-5" />
                </Button>
            </div>

            <div>
                <h3 className="font-medium text-zinc-200">{name}</h3>
                <p className="text-zinc-500 text-sm font-medium">
                    {loading ? "Updating..." : (isOn ? "On" : "Off")}
                </p>
            </div>
        </div>
    );
}
