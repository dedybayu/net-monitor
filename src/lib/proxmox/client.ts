// lib/proxmox.ts
import axios from 'axios';
import https from 'https';

export const getProxmoxClient = (config: {
  host: string;
  port: number;
  username: string;
  tokenName: string;
  tokenSecret: string;
}) => {
  const baseURL = `https://${config.host}:${config.port}/api2/json`;
  const apiToken = `${config.username}!${config.tokenName}=${config.tokenSecret}`;

  return axios.create({
    baseURL,
    headers: {
      Authorization: `PVEAPIToken=${apiToken}`,
    },
    // Proxmox sering menggunakan self-signed certificate
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });
};