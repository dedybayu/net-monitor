// PM2 Ecosystem Configuration
// Jalankan semua proses sekaligus dengan: pm2 start ecosystem.config.js
// Untuk auto-start saat reboot: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      // ─── Next.js App ───────────────────────────────────────────────
      name: "net-monitor",
      script: "node_modules/.bin/next",
      args: "start --port 3090",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      // ─── VNC WebSocket Proxy ───────────────────────────────────────
      name: "net-monitor-vnc-proxy",
      script: "node_modules/.bin/tsx",
      args: "--env-file=.env src/lib/proxmox/vnc-proxy.ts",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
