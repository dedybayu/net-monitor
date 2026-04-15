// page.tsx

"use client";

import React, { useEffect, useState, use } from "react";
import {
  Cpu, MemoryStick, HardDrive, Activity,
  ArrowUpCircle, ArrowDownCircle, Settings,
  Zap, Box, Clock, Play, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HAStatus {
  managed: number;
}

interface BlockStat {
  rd_operations?: number;
  wr_operations?: number;
  wr_highest_offset?: number;
}

interface ProxmoxSupport {
  [key: string]: boolean | string | number;
}

/** Shape saat VM running (semua field lengkap) */
interface VMStatusRunning {
  status: "running";
  name: string;
  vmid: number;
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  freemem: number;
  netin: number;
  netout: number;
  disk: number;
  maxdisk: number;
  diskread: number;
  diskwrite: number;
  uptime: number;
  pid: number;
  qmpstatus: string;
  agent?: number;
  ha: HAStatus;
  blockstat: Record<string, BlockStat>;
  "proxmox-support": ProxmoxSupport;
  "running-machine": string;
  "running-qemu": string;
}

/** Shape saat VM stopped (metrik resource semua 0, blockstat tidak ada) */
interface VMStatusStopped {
  status: "stopped";
  name: string;
  vmid: number;
  cpu: 0;
  cpus: number;
  mem: 0;
  maxmem: number;
  freemem?: number;
  netin: 0;
  netout: 0;
  disk: 0;
  maxdisk: number;
  diskread: 0;
  diskwrite: 0;
  uptime: 0;
  pid?: never;
  qmpstatus: string;
  agent?: number;
  ha: HAStatus;
  blockstat?: Record<string, BlockStat>;
  "proxmox-support"?: ProxmoxSupport;
  "running-machine"?: string;
  "running-qemu"?: string;
}

type VMStatus = VMStatusRunning | VMStatusStopped;

interface PageParams {
  workspace_id: string;
  proxmox_id: string;
  node_name: string;
  vm_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals))) + " " + sizes[i];
};

const formatUptime = (seconds: number): string => {
  if (seconds === 0) return "—";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricColor = "blue" | "purple" | "orange" | "emerald";

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
  blue:    { badge: "badge-info",       progress: "progress-info"      },
  purple:  { badge: "badge-secondary",  progress: "progress-secondary" },
  orange:  { badge: "badge-warning",    progress: "progress-warning"   },
  emerald: { badge: "badge-success",    progress: "progress-success"   },
};

function MetricCard({ title, value, subValue, icon, color, progress, disabled = false }: MetricCardProps) {
  const { badge, progress: progressClass } = colorConfig[color];

  return (
    <div className={`card bg-base-100 border border-base-200 shadow-none ${disabled ? "opacity-60" : ""}`}>
      <div className="card-body p-5 gap-2">
        <span className={`badge ${disabled ? "badge-ghost" : badge} badge-sm gap-1 self-start`}>
          {icon}
          {title}
        </span>
        <p className={`text-2xl font-semibold ${disabled ? "text-base-content/40" : "text-base-content"}`}>
          {value}
        </p>
        <p className="text-xs text-base-content/50 font-medium">{subValue}</p>
        {progress !== undefined && (
          <progress
            className={`progress ${disabled ? "progress-ghost" : progressClass} h-1.5 mt-1`}
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
        <p className="font-semibold text-sm">VM sedang tidak aktif</p>
        <p className="text-xs opacity-80 mt-0.5">
          Metrik resource tidak tersedia saat VM dalam kondisi stopped.
          Hanya informasi konfigurasi yang ditampilkan.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VMDetailPage({
  params: paramsPromise,
}: {
  params: Promise<PageParams>;
}) {
  const params = use(paramsPromise);

  const [data, setData] = useState<VMStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}/vm/${params.vm_id}/status`
        );
        const json = await res.json();
        setData(json.data as VMStatus);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch VM status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [params.proxmox_id, params.node_name, params.vm_id]);

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
          <span>VM data tidak ditemukan.</span>
        </div>
      </div>
    );

  const isRunning = data.status === "running";

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
            <div className={`p-3 rounded-xl ${isRunning ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
              <Box size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-base-content">
                {data.name}
                <span className="text-base-content/40 font-mono text-sm font-normal ml-2">({data.vmid})</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-block h-2 w-2 rounded-full ${isRunning ? "bg-success animate-pulse" : "bg-error"}`} />
                <span className={`badge badge-sm ${isRunning ? "badge-success" : "badge-error"}`}>
                  {data.status}
                </span>
                <span className="text-base-content/20">|</span>
                <span className="text-xs text-base-content/40">{data.cpus} vCPU · {formatBytes(data.maxmem)} RAM</span>
                {isRunning && data["running-machine"] && (
                  <>
                    <span className="text-base-content/20">|</span>
                    <span className="text-xs font-mono text-base-content/40">{data["running-machine"]}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline">Console</button>
            {!isRunning && (
              <button className="btn btn-sm btn-success gap-1">
                <Play size={12} />
                Start VM
              </button>
            )}
            <button className="btn btn-sm btn-primary">Manage VM</button>
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
          progress={isRunning ? (data.mem / data.maxmem) * 100 : 0}
          disabled={!isRunning}
        />
        <MetricCard
          title="Network I/O"
          value={isRunning ? formatBytes(data.netin + data.netout) : "—"}
          subValue={`In: ${formatBytes(data.netin)} | Out: ${formatBytes(data.netout)}`}
          icon={<Activity size={12} />}
          color="orange"
          disabled={!isRunning}
        />
        <MetricCard
          title="Uptime"
          value={formatUptime(data.uptime)}
          subValue={isRunning && data.pid ? `PID: ${data.pid}` : "VM tidak berjalan"}
          icon={<Clock size={12} />}
          color="emerald"
          disabled={!isRunning}
        />
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Disk */}
        <div className="card bg-base-100 border border-base-200 shadow-none lg:col-span-2">
          <div className="card-body p-5 gap-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <HardDrive size={15} className="text-base-content/40" />
              Disk statistics
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-base-content/50 mb-1 font-medium uppercase tracking-wide">Read throughput</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-semibold ${!isRunning ? "text-base-content/40" : ""}`}>
                    {formatBytes(data.diskread)}
                  </span>
                  {isRunning && <ArrowDownCircle size={13} className="text-info" />}
                </div>
              </div>
              <div>
                <p className="text-xs text-base-content/50 mb-1 font-medium uppercase tracking-wide">Write throughput</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-semibold ${!isRunning ? "text-base-content/40" : ""}`}>
                    {formatBytes(data.diskwrite)}
                  </span>
                  {isRunning && <ArrowUpCircle size={13} className="text-warning" />}
                </div>
              </div>
            </div>

            <div className="divider my-0 text-xs text-base-content/30 uppercase tracking-widest">
              {isRunning ? "Device block stats" : "Konfigurasi disk"}
            </div>

            {isRunning && data.blockstat && Object.keys(data.blockstat).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Read ops</th>
                      <th>Write ops</th>
                      <th>Highest offset</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {Object.entries(data.blockstat).map(([key, val]) => (
                      <tr key={key}>
                        <td className="font-bold text-primary">{key}</td>
                        <td>{val.rd_operations?.toLocaleString() ?? "—"}</td>
                        <td>{val.wr_operations?.toLocaleString() ?? "—"}</td>
                        <td className="text-xs text-base-content/40">
                          {formatBytes(val.wr_highest_offset ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-1">
                {[
                  ["Max disk", formatBytes(data.maxdisk)],
                  ["Disk allocated", formatBytes(data.disk)],
                  ["HA managed", data.ha.managed === 1 ? "yes" : "unmanaged"],
                  ["QEMU agent", data.agent === 1 ? "enabled" : "disabled"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-2 border-b border-base-200 last:border-0 text-sm">
                    <span className="text-base-content/50">{k}</span>
                    <span className={`font-mono font-medium ${k === "QEMU agent" && data.agent === 1 ? "text-success" : ""}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Capability / Config */}
        <div className="card bg-base-100 border border-base-200 shadow-none">
          <div className="card-body p-5 gap-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <Settings size={15} className="text-base-content/40" />
              {isRunning ? "Capability & tools" : "Konfigurasi VM"}
            </h2>

            <div className="bg-base-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/50">VMID</span>
                <kbd className="kbd kbd-sm font-mono">{data.vmid}</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/50">QMP status</span>
                <div className={`badge badge-sm ${isRunning ? "badge-success" : "badge-error"}`}>
                  {data.qmpstatus}
                </div>
              </div>
              {isRunning && data["running-qemu"] && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/50">QEMU version</span>
                  <kbd className="kbd kbd-sm font-mono">{data["running-qemu"]}</kbd>
                </div>
              )}
            </div>

            {/* Resource summary */}
            <div>
              <p className="text-xs font-bold uppercase text-base-content/30 tracking-wider mb-2">
                Resource allocation
              </p>
              {[
                ["vCPU", `${data.cpus} cores`],
                ["RAM max", formatBytes(data.maxmem)],
                ["Storage max", formatBytes(data.maxdisk)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1.5 border-b border-base-200 last:border-0">
                  <span className="text-base-content/50">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>

            {/* PBS Support — hanya ditampilkan saat running */}
            {isRunning && data["proxmox-support"] && (
              <div>
                <p className="text-xs font-bold uppercase text-base-content/30 tracking-wider mb-2">
                  Proxmox backup support
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(data["proxmox-support"])
                    .filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-[10px] font-medium text-base-content/60 bg-base-200 px-2 py-1.5 rounded-lg border border-base-300">
                        <Zap size={10} className={val ? "text-warning" : "text-base-content/20"} />
                        <span className="truncate">{key.replace("pbs-", "")}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Balloon memory — hanya saat running */}
            {isRunning && data.freemem !== undefined && (
              <div className="pt-2 border-t border-base-200">
                <p className="text-xs font-bold uppercase text-base-content/30 tracking-wider mb-2">
                  Balloon memory
                </p>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-base-content/50">Free in VM</span>
                  <span className="font-mono font-medium">{formatBytes(data.freemem)}</span>
                </div>
                <progress
                  className="progress progress-secondary h-1.5 w-full"
                  value={(data.freemem / data.maxmem) * 100}
                  max={100}
                />
              </div>
            )}

            {/* CTA saat stopped */}
            {!isRunning && (
              <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-3">
                <Play size={14} className="text-success flex-shrink-0" />
                <p className="text-xs text-success/80">
                  Klik <span className="font-semibold">Start VM</span> untuk menghidupkan virtual machine ini.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}