import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface WSMessage {
  type: string;
  channel: string;
  payload: unknown;
  timestamp: string;
}

interface ClientSubscription {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientSubscription> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const subscription: ClientSubscription = {
        id: clientId,
        ws,
        channels: new Set(),
      };

      this.clients.set(clientId, subscription);
      console.log(`[WebSocket] Client connected: ${clientId}. Total clients: ${this.clients.size}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection',
        channel: 'system',
        payload: { clientId, message: 'Connected to Marketing Pitch Assistant BFF' },
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (err) {
          this.sendToClient(ws, {
            type: 'error',
            channel: 'system',
            payload: { message: 'Invalid message format. Expected JSON.' },
            timestamp: new Date().toISOString(),
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error: Error) => {
        console.error(`[WebSocket] Client error (${clientId}):`, error.message);
        this.clients.delete(clientId);
      });
    });

    console.log('[WebSocket] Server initialized on /ws');
  }

  private handleClientMessage(clientId: string, message: Record<string, unknown>): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { action, channel } = message;

    switch (action) {
      case 'subscribe':
        if (typeof channel === 'string') {
          client.channels.add(channel);
          console.log(`[WebSocket] Client ${clientId} subscribed to: ${channel}`);
          this.sendToClient(client.ws, {
            type: 'subscribed',
            channel: channel,
            payload: { message: `Subscribed to ${channel}` },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'unsubscribe':
        if (typeof channel === 'string') {
          client.channels.delete(channel);
          console.log(`[WebSocket] Client ${clientId} unsubscribed from: ${channel}`);
          this.sendToClient(client.ws, {
            type: 'unsubscribed',
            channel: channel,
            payload: { message: `Unsubscribed from ${channel}` },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'ping':
        this.sendToClient(client.ws, {
          type: 'pong',
          channel: 'system',
          payload: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        this.sendToClient(client.ws, {
          type: 'error',
          channel: 'system',
          payload: { message: `Unknown action: ${action}` },
          timestamp: new Date().toISOString(),
        });
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast a message to all clients subscribed to the given channel.
   */
  broadcast(channel: string, type: string, payload: unknown): void {
    const message: WSMessage = {
      type,
      channel,
      payload,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcast to ${sentCount} client(s) on channel: ${channel}`);
    }
  }

  /**
   * Broadcast pitch generation progress updates.
   */
  broadcastPitchProgress(pitchId: string, progress: {
    step: string;
    percentage: number;
    message: string;
    agentName?: string;
  }): void {
    this.broadcast(`pitch:${pitchId}`, 'pitch_progress', {
      pitchId,
      ...progress,
    });

    // Also broadcast to the general pitches channel
    this.broadcast('pitches', 'pitch_progress', {
      pitchId,
      ...progress,
    });
  }

  /**
   * Broadcast agent execution status updates.
   */
  broadcastAgentStatus(executionId: string, status: {
    agentName: string;
    state: string;
    message: string;
    result?: unknown;
  }): void {
    this.broadcast(`agent:${executionId}`, 'agent_status', {
      executionId,
      ...status,
    });

    this.broadcast('agents', 'agent_status', {
      executionId,
      ...status,
    });
  }

  /**
   * Broadcast campaign update events.
   */
  broadcastCampaignUpdate(campaignId: string, update: {
    action: string;
    status: string;
    message: string;
    metrics?: unknown;
  }): void {
    this.broadcast(`campaign:${campaignId}`, 'campaign_update', {
      campaignId,
      ...update,
    });

    this.broadcast('campaigns', 'campaign_update', {
      campaignId,
      ...update,
    });
  }

  /**
   * Broadcast to all connected clients regardless of subscription.
   */
  broadcastAll(type: string, payload: unknown): void {
    const message: WSMessage = {
      type,
      channel: 'broadcast',
      payload,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
export default wsService;
