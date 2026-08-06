import { useEffect } from "react";
import { type RealtimeEvent, type RealtimeEventHandler, realtimeClient } from "@/lib/realtime/ws-client";

/** 订阅实时频道；enabled=false 时不订阅。 */
export function useRealtimeChannel(channel: string | null, handler: RealtimeEventHandler, enabled = true): void {
  useEffect(() => {
    if (!enabled || !channel) return;
    return realtimeClient.subscribe(channel, handler);
  }, [channel, handler, enabled]);
}

export type { RealtimeEvent, RealtimeEventHandler };
