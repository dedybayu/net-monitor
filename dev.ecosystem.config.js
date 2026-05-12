// PM2 Development Ecosystem Configuration
// Run with: pm2 start dev.ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "net-monitor-dev",
      script: "npm",
      args: "run dev",
      cwd: "./",
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "net-monitor-worker-dev",
      script: "node",
      args: "worker.js",
      cwd: "./",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
