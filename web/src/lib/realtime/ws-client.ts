/** 单通道实时 WebSocket 客户端（币安式多路订阅）。 */

export type RealtimeEventType = "update" | "changed" | "snapshot";

export type RealtimeEvent = {
  channel: string;
  type: RealtimeEventType;
  payload: Record<string, unknown>;
};

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

type ServerMessage = {
  op: string;
  channels?: string[];
  channel?: string;
  type?: RealtimeEventType;
  payload?: Record<string, unknown>;
  message?: string;
};

const RECONNECT_MS = 2000;
const HEARTBEAT_MS = 25000;

function wsUrl(token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/v1/ws?token=${encodeURIComponent(token)}`;
}

class RealtimeClient {
  private token: string | null = null;
  private socket: WebSocket | null = null;
  private readonly handlers = new Map<string, Set<RealtimeEventHandler>>();
  private readonly refCounts = new Map<string, number>();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private intentionalClose = false;

  connect(token: string, force = false): void {
    if (!force && this.token === token && this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }
    this.intentionalClose = false;
    this.token = token;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.token = null;
    this.clearReconnect();
    this.clearHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.handlers.clear();
    this.refCounts.clear();
  }

  subscribe(channel: string, handler: RealtimeEventHandler): () => void {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
    }
    set.add(handler);
    const prev = this.refCounts.get(channel) ?? 0;
    this.refCounts.set(channel, prev + 1);
    if (prev === 0) {
      this.send({ op: "subscribe", channels: [channel] });
    }
    return () => this.unsubscribe(channel, handler);
  }

  private unsubscribe(channel: string, handler: RealtimeEventHandler): void {
    const set = this.handlers.get(channel);
    set?.delete(handler);
    if (set && set.size === 0) {
      this.handlers.delete(channel);
    }
    const prev = this.refCounts.get(channel) ?? 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
      this.refCounts.delete(channel);
      this.send({ op: "unsubscribe", channels: [channel] });
    } else {
      this.refCounts.set(channel, next);
    }
  }

  /** 一次性等待频道事件（短剧同步等）；超时抛错。 */
  waitForEvent(
    channel: string,
    predicate: (event: RealtimeEvent) => boolean,
    timeoutMs: number,
    signal?: { cancelled: boolean },
  ): Promise<RealtimeEvent> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("同步超时，请稍后重试"));
      }, timeoutMs);
      const unsub = this.subscribe(channel, (event) => {
        if (settled || signal?.cancelled) return;
        if (!predicate(event)) return;
        settled = true;
        cleanup();
        resolve(event);
      });
      const pollCancel = window.setInterval(() => {
        if (signal?.cancelled) {
          settled = true;
          cleanup();
          reject(new Error("cancelled"));
        }
      }, 200);
      const cleanup = () => {
        window.clearTimeout(timer);
        window.clearInterval(pollCancel);
        unsub();
      };
    });
  }

  private openSocket(): void {
    if (!this.token) return;
    this.clearReconnect();
    this.clearHeartbeat();
    const prev = this.socket;
    if (prev) {
      prev.onclose = null;
      prev.onerror = null;
      prev.onmessage = null;
      try {
        prev.close();
      } catch {
        // ignore
      }
    }
    const ws = new WebSocket(wsUrl(this.token));
    this.socket = ws;
    ws.onopen = () => {
      this.resubscribeAll();
      this.heartbeatTimer = window.setInterval(() => {
        this.send({ op: "ping" });
      }, HEARTBEAT_MS);
    };
    ws.onmessage = (ev) => this.onMessage(ev.data);
    ws.onclose = () => {
      this.clearHeartbeat();
      if (this.socket === ws) {
        this.socket = null;
      }
      if (!this.intentionalClose && this.token) {
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), RECONNECT_MS);
      }
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  private resubscribeAll(): void {
    const channels = [...this.refCounts.keys()];
    if (channels.length === 0) return;
    this.send({ op: "subscribe", channels });
  }

  private onMessage(raw: unknown): void {
    if (typeof raw !== "string") return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    if (msg.op === "pong" || msg.op === "subscribed" || msg.op === "unsubscribed") {
      return;
    }
    if (msg.op !== "event" || !msg.channel) return;
    const event: RealtimeEvent = {
      channel: msg.channel,
      type: msg.type ?? "changed",
      payload: msg.payload ?? {},
    };
    const set = this.handlers.get(msg.channel);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(event);
      } catch {
        // 单 handler 失败不影响其它订阅
      }
    }
  }

  private send(body: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(body));
  }

  private clearReconnect(): void {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();

export const REALTIME_CHANNELS = {
  exportJobBadge: "export_job.badge",
  exportJobMine: "export_job.mine",
  authSession: "auth.session",
} as const;
