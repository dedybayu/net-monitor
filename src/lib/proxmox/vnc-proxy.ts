import { WebSocketServer, WebSocket } from 'ws';
import https from 'https';
import { URL } from 'url';
import { prisma } from '../prisma/client';
import { decrypt } from '../security/encryption';

const PORT = 3091;

const wss = new WebSocketServer({ port: PORT });

console.log(`✅ noVNC WebSocket Proxy berjalan di ws://0.0.0.0:${PORT}`);

wss.on('connection', async (clientWs, request) => {
  try {
    const requestUrl = new URL(request.url || '', `http://${request.headers.host}`);
    const proxmoxIdStr = requestUrl.searchParams.get('proxmox_id');
    const node = requestUrl.searchParams.get('node');
    const vmid = requestUrl.searchParams.get('vmid');
    const vncPort = requestUrl.searchParams.get('port');
    const vncTicket = requestUrl.searchParams.get('vncticket');

    if (!proxmoxIdStr || !node || !vmid || !vncPort || !vncTicket) {
      console.error('[VNC Proxy] Missing parameters:', { proxmoxIdStr, node, vmid, vncPort, vncTicket: vncTicket ? '***' : null });
      clientWs.close(1008, 'Missing parameters: proxmox_id, node, vmid, port, vncticket required');
      return;
    }

    const proxmoxId = parseInt(proxmoxIdStr, 10);
    const connection = await prisma.proxmox.findUnique({
      where: { proxmox_id: proxmoxId }
    });

    if (!connection) {
      clientWs.close(1008, 'Proxmox connection not found');
      return;
    }

    const tokenSecret = decrypt(connection.proxmox_token_secret);
    const authHeader = `PVEAPIToken=${connection.proxmox_username}!${connection.proxmox_token_name}=${tokenSecret}`;

    // Hubungkan ke Proxmox WebSocket menggunakan ticket dan port yang diberikan oleh client
    const wssUrl = `wss://${connection.proxmox_host}:${connection.proxmox_port}/api2/json/nodes/${node}/qemu/${vmid}/vncwebsocket?port=${vncPort}&vncticket=${encodeURIComponent(vncTicket)}`;
    
    console.log(`[VNC Proxy] Connecting to Proxmox WS for VM ${vmid}...`);
    const proxmoxWs = new WebSocket(wssUrl, {
      headers: { Authorization: authHeader },
      rejectUnauthorized: false
    });

    proxmoxWs.on('open', () => {
      console.log(`[VNC Proxy] Connected to VM ${vmid}`);
    });

    proxmoxWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    clientWs.on('message', (data) => {
      if (proxmoxWs.readyState === WebSocket.OPEN) {
        proxmoxWs.send(data);
      }
    });

    proxmoxWs.on('close', () => clientWs.close());
    clientWs.on('close', () => proxmoxWs.close());
    
    proxmoxWs.on('error', (err) => {
      console.error('[VNC Proxy] Proxmox WS Error:', err.message);
      clientWs.close();
    });

    clientWs.on('error', (err) => {
      console.error('[VNC Proxy] Client WS Error:', err.message);
      proxmoxWs.close();
    });

  } catch (error: any) {
    console.error('[VNC Proxy] Error:', error.response?.data || error.message);
    clientWs.close(1011, 'Internal Server Error');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[VNC Proxy] Shutting down...');
  wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  wss.close();
  process.exit(0);
});
