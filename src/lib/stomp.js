import { Client } from '@stomp/stompjs';

// Thin SockJS-over-WebSocket adapter. Handles SockJS wire framing so we don't
// need the full sockjs-client package. Spring's SockJS server supports the
// WebSocket transport at: /ws/{server}/{session}/websocket
class SockJSSocket {
  constructor(url) {
    this.readyState = 0;
    const wsBase = url.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws')).replace(/\/$/, '');
    const srv = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const sid = Math.random().toString(36).substring(2, 10);
    this._ws = new WebSocket(`${wsBase}/${srv}/${sid}/websocket`);
    this._ws.onmessage = (e) => this._onFrame(e.data);
    this._ws.onclose = (e) => { this.readyState = 3; this.onclose?.(e); };
    this._ws.onerror = (e) => this.onerror?.(e);
  }

  _onFrame(raw) {
    if (raw === 'o') {
      this.readyState = 1;
      this.onopen?.({});
    } else if (raw === 'h') {
      // SockJS heartbeat — ignore
    } else if (raw.startsWith('a')) {
      const msgs = JSON.parse(raw.slice(1));
      for (const m of msgs) this.onmessage?.({ data: m });
    } else if (raw.startsWith('c')) {
      const [code, reason] = JSON.parse(raw.slice(1));
      this.readyState = 3;
      this.onclose?.({ code, reason, wasClean: true });
    }
  }

  send(data) { this._ws.send(JSON.stringify([data])); }
  close() { this._ws.close(); }
}

// Subscribe to real-time EmailJobStatus updates for a given jobId.
// Returns a cleanup function to disconnect.
// onUpdate(EmailJobStatus) is called on each STOMP message.
// onError(message) is called on connection/protocol errors.
export function watchEmailJob(jobId, onUpdate, onError) {
  const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const baseUrl = `${proto}//${window.location.host}/ws`;

  const client = new Client({
    webSocketFactory: () => new SockJSSocket(baseUrl),
    reconnectDelay: 0,
    onStompError: (f) => onError?.(f.headers?.message ?? 'STOMP error'),
  });

  client.onConnect = () => {
    client.subscribe(`/topic/email-jobs/${jobId}`, (msg) => {
      try {
        const status = JSON.parse(msg.body);
        onUpdate(status);
        if (status.state === 'COMPLETED') client.deactivate();
      } catch {}
    });
  };

  client.activate();
  return () => { try { client.deactivate(); } catch {} };
}
