import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'status',
})
export class StatusGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StatusGateway.name);
  private connectedClients = new Map<string, { connectedAt: number; lastPing?: number }>();

  handleConnection(client: Socket) {
    const now = Date.now();
    this.connectedClients.set(client.id, { connectedAt: now });
    this.logger.log(`✅ Cliente conectado: ${client.id} (Total: ${this.connectedClients.size})`);
    
    // Enviar estado inicial
    client.emit('status-update', {
      status: 'online',
      timestamp: new Date().toISOString(),
      message: 'Servidor operativo',
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`❌ Cliente desconectado: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const now = Date.now();
    
    // Actualizar último ping del cliente
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.lastPing = now;
      this.connectedClients.set(client.id, clientData);
    }

    // Enviar pong con timestamp para cálculo de latencia
    client.emit('pong', {
      timestamp: now,
    });
  }

  broadcastStatus(status: 'online' | 'offline' | 'degraded', message?: string) {
    const data = {
      status,
      timestamp: new Date().toISOString(),
      message: message || 'Estado actualizado',
    };
    
    // Solo hacer broadcast si hay clientes conectados
    if (this.connectedClients.size > 0) {
      this.server.emit('status-update', data);
      this.logger.debug(`📡 Broadcast enviado: ${status} a ${this.connectedClients.size} clientes`);
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Limpia clientes inactivos (opcional, para producción)
   */
  cleanupInactiveClients(maxInactivityMs: number = 60000) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [clientId, data] of this.connectedClients.entries()) {
      if (data.lastPing && (now - data.lastPing) > maxInactivityMs) {
        const client = this.server.sockets.sockets.get(clientId);
        if (client) {
          client.disconnect(true);
          cleaned++;
        }
        this.connectedClients.delete(clientId);
      }
    }
    
    if (cleaned > 0) {
      this.logger.log(`🧹 Limpiados ${cleaned} clientes inactivos`);
    }
  }
}
