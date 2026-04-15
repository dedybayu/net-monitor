"use client";

import React, { useEffect, useState, use } from "react";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Box,
  Clock,
  Play,
  AlertTriangle,
  Network,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HAStatus {
  managed: number;
}

/** Shape saat CT running */
interface CTStatusRunning {
  status: "running";
  name: string;
  vmid: number;
  type: "lxc";
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  swap: number;
  maxswap: number;
  disk: number;
  maxdisk: number;
  diskread: number;
  diskwrite: number;
  netin: number;
  netout: number;
  uptime: number;
  pid: number;
  ha: HAStatus;
}

/** Shape saat CT stopped (semua metrik 0) */
interface CTStatusStopped {
  status: "stopped";
  name: string;
  vmid: number;
  type: "lxc";
  cpu: 0;
  cpus: number;
  mem: 0;
  maxmem: number;
  swap: 0;
  maxswap: number;
  disk: 0;
  maxdisk: number;
  diskread: 0;
  diskwrite: 0;
  netin: 0;
  netout: 0;
  uptime: 0;
  pid?: never;
  ha: HAStatus;
}

type CTStatus = CTStatusRunning | CTStatusStopped;

interface PageParams {
  workspace_id: string;
  proxmox_id: string;
  node_name: string;
  ct_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) +
    " " +
    sizes[i]
  );
};

const formatUptime = (seconds: number): string => {
  if (seconds === 0) return "—";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

const calcPct = (used: number, max: number): number =>
  max > 0 ? Math.min(100, (used / max) * 100) : 0;

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricColor = "blue" | "purple" | "orange" | "emerald" | "teal";

interface MetricCardProps {
  title: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
  color: MetricColor;
  progress?: number;
  disabled?: boolean;
}

const colorConfig: Record<MetricColor, { badge: string; progress: string }> = {
  blue:    { badge: "badge-info",      progress: "progress-info"      },
  purple:  { badge: "badge-secondary", progress: "progress-secondary" },
  orange:  { badge: "badge-warning",   progress: "progress-warning"   },
  emerald: { badge: "badge-success",   progress: "progress-success"   },
  teal:    { badge: "badge-accent",    progress: "progress-accent"    },
};

function MetricCard({
  title,
  value,
  subValue,
  icon,
  color,
  progress,
  disabled = false,
}: MetricCardProps) {
  const { badge, progress: progressClass } = colorConfig[color];

  return (
    <div
      className={`card bg-base-100 border border-base-200 shadow-none ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="card-body p-5 gap-2">
        <span
          className={`badge ${
            disabled ? "badge-ghost" : badge
          } badge-sm gap-1 self-start`}
        >
          {icon}
          {title}
        </span>
        <p
          className={`text-2xl font-semibold ${
            disabled ? "text-base-content/40" : "text-base-content"
          }`}
        >
          {value}
        </p>
        <p className="text-xs text-base-content/50 font-medium">{subValue}</p>
        {progress !== undefined && (
          <progress
            className={`progress ${
              disabled ? "progress-ghost" : progressClass
            } h-1.5 mt-1`}
            value={disabled ? 0 : Math.min(progress, 100)}
            max={100}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stopped Banner ───────────────────────────────────────────────────────────

function StoppedBanner() {
  return (
    <div className="alert alert-warning border border-warning/30 shadow-none rounded-xl">
      <AlertTriangle size={16} />
      <div>
        <p className="font-semibold text-sm">Container sedang tidak aktif</p>
        <p className="text-xs opacity-80 mt-0.5">
          Metrik resource tidak tersedia saat CT dalam kondisi stopped. Hanya
          informasi konfigurasi yang ditampilkan.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CTDetailPage({
  params: paramsPromise,
}: {
  params: Promise<PageParams>;
}) {
  const params = use(paramsPromise);

  const [data, setData] = useState<CTStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}/ct/${params.ct_id}/status`
        );
        const json = await res.json();
        setData(json.data as CTStatus);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch CT status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [params.proxmox_id, params.node_name, params.ct_id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="alert alert-error max-w-sm shadow-none">
          <span>Container data tidak ditemukan.</span>
        </div>
      </div>
    );

  const isRunning = data.status === "running";
  const memPct = calcPct(data.mem, data.maxmem);
  const swapPct = calcPct(data.swap, data.maxswap);
  const diskPct = calcPct(data.disk, data.maxdisk);

  return (
    <div className="min-h-screen bg-base-200 text-base-content pt-20 lg:pl-64 p-6 space-y-4">

      {/* ── Refresh indicator ── */}
      <div className="flex items-center justify-between text-xs text-base-content/40 px-1">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-base-content/30 animate-pulse" />
          Auto-refresh setiap 5 detik
        </span>
        {lastUpdated && (
          <span className="font-mono">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── Header ── */}
      <div className="card bg-base-100 border border-base-200 shadow-none">
        <div className="card-body p-5 flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                isRunning
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error"
              }`}
            >
              <Box size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-base-content">
                {data.name}
                <span className="text-base-content/40 font-mono text-sm font-normal ml-2">
                  ({data.vmid})
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isRunning ? "bg-success animate-pulse" : "bg-error"
                  }`}
                />
                <span
                  className={`badge badge-sm ${
                    isRunning ? "badge-success" : "badge-error"
                  }`}
                >
                  {data.status}
                </span>
                <span className="text-base-content/20">|</span>
                <span className="text-xs text-base-content/40">
                  {data.cpus} vCPU · {formatBytes(data.maxmem)} RAM ·{" "}
                  <span className="uppercase font-mono">{data.type}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline">Console</button>
            {!isRunning && (
              <button className="btn btn-sm btn-success gap-1">
                <Play size={12} />
                Start CT
              </button>
            )}
            {isRunning && (
              <>
                <button className="btn btn-sm btn-warning btn-outline">
                  Reboot
                </button>
                <button className="btn btn-sm btn-error btn-outline">
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stopped banner ── */}
      {!isRunning && <StoppedBanner />}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={isRunning ? `${(data.cpu * 100).toFixed(2)}%` : "— %"}
          subValue={`${data.cpus} vCPU dialokasikan`}
          icon={<Cpu size={12} />}
          color="blue"
          progress={isRunning ? data.cpu * 100 : 0}
          disabled={!isRunning}
        />
        <MetricCard
          title="Memory"
          value={isRunning ? formatBytes(data.mem) : "0 Bytes"}
          subValue={`dari ${formatBytes(data.maxmem)} total`}
          icon={<MemoryStick size={12} />}
          color="purple"
          progress={memPct}
          disabled={!isRunning}
        />
        <MetricCard
          title="Network I/O"
          value={
            isRunning ? formatBytes(data.netin + data.netout) : "—"
          }
          subValue={`In: ${formatBytes(data.netin)} | Out: ${formatBytes(data.netout)}`}
          icon={<Activity size={12} />}
          color="orange"
          disabled={!isRunning}
        />
        <MetricCard
          title="Uptime"
          value={formatUptime(data.uptime)}
          subValue={
            isRunning && data.pid
              ? `PID: ${data.pid}`
              : "CT tidak berjalan"
          }
          icon={<Clock size={12} />}
          color="emerald"
          disabled={!isRunning}
        />
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Disk & Swap */}
        <div className="card bg-base-100 border border-base-200 shadow-none lg:col-span-2">
          <div className="card-body p-5 gap-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <HardDrive size={15} className="text-base-content/40" />
              Disk & Swap
            </h2>

            {/* Disk throughput */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-base-content/50 mb-1 font-medium uppercase tracking-wide">
                  Read throughput
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xl font-semibold ${
                      !isRunning ? "text-base-content/40" : ""
                    }`}
                  >
                    {formatBytes(data.diskread)}
                  </span>
                  {isRunning && (
                    <ArrowDownCircle size={13} className="text-info" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1 font-medium uppercase tracking-wide">
                  Write throughput
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xl font-semibold ${
                      !isRunning ? "text-base-content/40" : ""
                    }`}
                  >
                    {formatBytes(data.diskwrite)}
                  </span>
                  {isRunning && (
                    <ArrowUpCircle size={13} className="text-warning" />
                  )}
                </div>
              </div>
            </div>

            <div className="divider my-0 text-xs text-base-content/30 uppercase tracking-widest">
              Penggunaan storage
            </div>

            {/* Disk usage bar */}
            <div>
              <div className="flex justify-between text-xs text-base-content/50 mb-1.5 font-medium">
                <span>Disk</span>
                <span>
                  {formatBytes(data.disk)} / {formatBytes(data.maxdisk)} (
                  {diskPct.toFixed(1)}%)
                </span>
              </div>
              <progress
                className={`progress ${
                  isRunning ? "progress-warning" : "progress-ghost"
                } h-2 w-full`}
                value={isRunning ? diskPct : 0}
                max={100}
              />
            </div>

            {/* Swap usage bar */}
            <div>
              <div className="flex justify-between text-xs text-base-content/50 mb-1.5 font-medium">
                <span>Swap</span>
                <span>
                  {formatBytes(data.swap)} / {formatBytes(data.maxswap)} (
                  {swapPct.toFixed(1)}%)
                </span>
              </div>
              <progress
                className={`progress ${
                  isRunning ? "progress-secondary" : "progress-ghost"
                } h-2 w-full`}
                value={isRunning ? swapPct : 0}
                max={100}
              />
            </div>
          </div>
        </div>

        {/* Config & Network */}
        <div className="card bg-base-100 border border-base-200 shadow-none">
          <div className="card-body p-5 gap-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <Settings size={15} className="text-base-content/40" />
              Konfigurasi CT
            </h2>

            {/* Identitas */}
            <div className="bg-base-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/50">VMID</span>
                <kbd className="kbd kbd-sm font-mono">{data.vmid}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/50">Type</span>
                <span className="badge badge-sm badge-ghost font-mono uppercase">
                  {data.type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/50">HA managed</span>
                <span
                  className={`badge badge-sm ${
                    data.ha.managed ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {data.ha.managed ? "yes" : "unmanaged"}
                </span>
              </div>
            </div>

            {/* Resource allocation */}
            <div>
              <p className="text-xs font-bold uppercase text-base-content/30 tracking-wider mb-2">
                Resource allocation
              </p>
              {[
                ["vCPU", `${data.cpus} cores`],
                ["RAM max", formatBytes(data.maxmem)],
                ["Swap max", formatBytes(data.maxswap)],
                ["Storage max", formatBytes(data.maxdisk)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between text-sm py-1.5 border-b border-base-200 last:border-0"
                >
                  <span className="text-base-content/50">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>

            {/* Network totals — hanya saat running */}
            {isRunning && (
              <div>
                <p className="text-xs font-bold uppercase text-base-content/30 tracking-wider mb-2 flex items-center gap-1.5">
                  <Network size={11} />
                  Network totals
                </p>
                {[
                  ["Inbound", formatBytes(data.netin)],
                  ["Outbound", formatBytes(data.netout)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between text-sm py-1.5 border-b border-base-200 last:border-0"
                  >
                    <span className="text-base-content/50">{k}</span>
                    <span className="font-mono font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA saat stopped */}
            {!isRunning && (
              <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-3">
                <Play size={14} className="text-success flex-shrink-0" />
                <p className="text-xs text-success/80">
                  Klik{" "}
                  <span className="font-semibold">Start CT</span> untuk
                  menghidupkan container ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}