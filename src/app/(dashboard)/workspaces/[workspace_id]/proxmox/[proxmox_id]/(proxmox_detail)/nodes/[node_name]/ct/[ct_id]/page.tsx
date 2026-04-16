// page.tsx

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
  ArrowLeft,
  Terminal,
  RefreshCw,
  RotateCcw,
  PowerOff
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HAStatus {
  managed: number;
}

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
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
};

const calcPct = (used: number, max: number): number =>
  max > 0 ? Math.min(100, (used / max) * 100) : 0;

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

const colorConfig: Record<MetricColor, { badge: string; colorClass: string }> = {
  blue:    { badge: "bg-info/10 text-info",       colorClass: "info"      },
  purple:  { badge: "bg-secondary/10 text-secondary",  colorClass: "secondary" },
  orange:  { badge: "bg-warning/10 text-warning",    colorClass: "warning"   },
  emerald: { badge: "bg-success/10 text-success",    colorClass: "success"   },
};

function MetricCard({ title, value, subValue, icon, color, progress, disabled = false }: MetricCardProps) {
  const { badge, colorClass } = colorConfig[color];

  return (
    <div className={`relative overflow-hidden bg-base-100 border border-base-300 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group ${disabled ? "opacity-60 mix-blend-luminosity hover:border-base-300 hover:shadow-sm hover:translate-y-0" : `hover:border-${colorClass}/40 hover:shadow-${colorClass}/5`}`}>
      {!disabled && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/0 via-success/50 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
      <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity text-${colorClass} pointer-events-none`}>
          {icon && React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 100 })}
      </div>
      <div className="relative z-10 flex flex-col gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${disabled ? "bg-base-200 text-base-content/40" : badge}`}>
          {icon && React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{title}</p>
          <p className={`text-3xl font-black tracking-tighter leading-none mb-1.5 ${disabled ? "text-base-content/40" : "text-base-content"}`}>
            {value}
          </p>
          <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-widest">{subValue}</p>
        </div>
        {progress !== undefined && (
          <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden border border-base-300/50 mt-1">
            <div className={`h-full rounded-full transition-all duration-1000 bg-${colorClass} ${disabled ? "bg-base-content/20" : ""}`} style={{ width: `${disabled ? 0 : Math.min(progress, 100)}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stopped Banner ───────────────────────────────────────────────────────────

function StoppedBanner() {
  return (
    <div className="alert alert-warning bg-warning/10 border-warning/20 text-warning rounded-3xl shadow-sm mb-6">
      <AlertTriangle size={24} />
      <div>
        <h3 className="font-black tracking-tight text-lg">Container Offline</h3>
        <p className="text-xs font-medium opacity-80">
          Metrik resource langsung (RAM/Disk) tidak tersedia saat Container LXC mati. Hanya batas alokasi konfigurasi yang dapat ditabulasi saat ini.
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

  const REFRESH_INTERVAL = 5;
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchStatus = async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [params.proxmox_id, params.node_name, params.ct_id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  if (loading && !data)
    return (
        <div className="min-h-screen z-1 flex flex-col items-center justify-center bg-base-200 lg:pl-72 pt-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] opacity-40 animate-pulse">Syncing Container Data...</p>
        </div>
    );

  if (!data)
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 pt-20 lg:pl-72">
             <div className="alert alert-error bg-error/10 border-error/20 text-error rounded-3xl shadow-sm max-w-lg">
                <AlertTriangle size={24} />
                <div>
                  <h3 className="font-black tracking-tight text-lg">Not Found</h3>
                  <p className="text-xs font-medium opacity-80">Data Container LXC ini tidak ditemukan atau telah dikarantina.</p>
                </div>
            </div>
        </div>
    );

  const isRunning = data.status === "running";
  const memPct = calcPct(data.mem, data.maxmem);
  const swapPct = calcPct(data.swap, data.maxswap);
  const diskPct = calcPct(data.disk, data.maxdisk);

  return (
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-72 pt-10 transition-all cursor-default pb-20">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
              <Link href={`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes/${params.node_name}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                  <ArrowLeft size={16} />
              </Link>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                  <span className="inline-block h-px w-6 bg-primary"></span>
                  LXC Container Details
              </p>
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
            <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-3xl border shadow-inner flex items-center justify-center shrink-0 ${isRunning ? 'bg-success/10 text-success border-success/20' : 'bg-base-200 text-base-content/30 border-base-300'}`}>
                    <Box size={40} />
                </div>
                <div>
                    <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content flex items-center gap-4">
                      {data.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <div className="badge bg-base-100 border-base-300 gap-1.5 font-black text-[10px] uppercase tracking-widest px-3 py-3 shadow-sm text-base-content/60">
                         ID: {data.vmid}
                      </div>
                      <div className={`badge gap-2 font-black uppercase text-[10px] tracking-widest px-4 py-3 border-none flex items-center shadow-sm ${isRunning ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                         {isRunning && <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>} 
                         {isRunning ? 'RUNNING' : 'STOPPED'}
                      </div>
                      <div className="badge bg-base-200 border-base-300 gap-1.5 font-bold text-[9px] uppercase tracking-widest px-3 py-3">
                         <Cpu size={12}/> {data.cpus} vCPU
                      </div>
                      <div className="badge bg-base-200 border-base-300 gap-1.5 font-bold text-[9px] uppercase tracking-widest px-3 py-3">
                         <MemoryStick size={12}/> {formatBytes(data.maxmem)} RAM
                      </div>
                    </div>
                </div>
            </div>

            {/* Top action buttons */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-base-100 p-1.5 rounded-3xl border border-base-300 shadow-sm mr-2">
                    <button className="btn btn-ghost hover:bg-base-200 btn-circle btn-sm text-base-content/40 hover:text-base-content">
                        <Terminal size={14}/>
                    </button>
                    {!isRunning ? (
                      <button className="btn rounded-2xl btn-success text-white font-black tracking-widest uppercase text-[10px] px-6 shadow-sm shadow-success/20 border-none">
                        <Play size={14} className="mr-1"/> Power On
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-warning gap-1 font-black tracking-widest text-[10px] rounded-2xl px-5 text-warning-content shadow-sm shadow-warning/20 border-none">
                          <RotateCcw size={14}/> Reboot
                        </button>
                        <button className="btn btn-error gap-1 font-black tracking-widest text-[10px] rounded-2xl px-5 text-white shadow-sm shadow-error/20 border-none">
                          <PowerOff size={14}/> Stop
                        </button>
                      </>
                    )}
                </div>
                
                {/* Refresh component */}
                <div className="flex items-center gap-3 bg-base-100 p-1.5 rounded-3xl border border-base-300 shadow-sm hidden md:flex">
                    <div className="flex items-center gap-3 px-3 border-r border-base-200">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-base-content/30 uppercase tracking-widest leading-none mb-0.5">Sync</span>
                        <span className="text-xs font-black tracking-tighter text-primary leading-none">{countdown}s</span>
                      </div>
                      <div className="radial-progress text-primary transition-all duration-1000" style={{ "--value": ((countdown / REFRESH_INTERVAL) * 100).toFixed(0), "--size": "1.5rem", "--thickness": "3px" } as React.CSSProperties}></div>
                    </div>
                    <button onClick={() => { setLoading(true); fetchStatus(true); }} disabled={loading} className="btn btn-circle btn-ghost btn-sm text-base-content/60 hover:text-primary hover:bg-primary/10">
                      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* ── Stopped banner ── */}
        {!isRunning && <StoppedBanner />}

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Computational Block"
            value={isRunning ? `${(data.cpu * 100).toFixed(1)}%` : "0%"}
            subValue={`${data.cpus} vCPU Logic Cores`}
            icon={<Cpu size={12} />}
            color="blue"
            progress={isRunning ? data.cpu * 100 : 0}
            disabled={!isRunning}
          />
          <MetricCard
            title="Active Memory"
            value={isRunning ? formatBytes(data.mem) : "0 B"}
            subValue={`of ${formatBytes(data.maxmem)} Allocated Limit`}
            icon={<MemoryStick size={12} />}
            color="purple"
            progress={memPct}
            disabled={!isRunning}
          />
          <MetricCard
            title="Network Transfers"
            value={
              isRunning ? formatBytes(data.netin + data.netout) : "0 B"
            }
            subValue={`In: ${formatBytes(data.netin)} / Out: ${formatBytes(data.netout)}`}
            icon={<Activity size={12} />}
            color="orange"
            disabled={!isRunning}
          />
          <MetricCard
            title="Container Uptime"
            value={formatUptime(data.uptime)}
            subValue={
              isRunning && data.pid
                ? `System PID: ${data.pid}`
                : "Container Blocked Offline"
            }
            icon={<Clock size={12} />}
            color="emerald"
            disabled={!isRunning}
          />
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Disk & Swap Analytics */}
          <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8 lg:col-span-2">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-8 flex items-center gap-2">
                <HardDrive size={14} /> Disk & Swap Allocation
            </h2>

            {/* Throughput metrics */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-base-200 rounded-3xl p-6 border border-base-300 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Read Throughput</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
                           <ArrowDownCircle size={20}/>
                        </div>
                        <span className={`text-3xl font-black tracking-tighter ${!isRunning ? "opacity-30" : ""}`}>
                            {formatBytes(data.diskread)}
                        </span>
                    </div>
                </div>
                <div className="bg-base-200 rounded-3xl p-6 border border-base-300 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Write Throughput</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                           <ArrowUpCircle size={20}/>
                        </div>
                        <span className={`text-3xl font-black tracking-tighter ${!isRunning ? "opacity-30" : ""}`}>
                            {formatBytes(data.diskwrite)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="divider opacity-30 text-[9px] font-black uppercase tracking-widest mb-6">
                Live Capacity
            </div>

            <div className="space-y-6">
                {/* Disk usage bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">LXC Volume Storage</span>
                        <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                            {formatBytes(data.disk)} / {formatBytes(data.maxdisk)}
                        </span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                        <div className={`h-full rounded-full transition-all duration-1000 ${diskPct > 90 ? 'bg-error' : 'bg-warning'} ${!isRunning ? "bg-base-content/20" : ""}`} style={{ width: `${isRunning ? diskPct : Math.min(diskPct, 100)}%` }}></div>
                    </div>
                </div>

                {/* Swap usage bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Virtual Swap Page</span>
                        <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                            {formatBytes(data.swap)} / {formatBytes(data.maxswap)}
                        </span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                        <div className={`h-full rounded-full transition-all duration-1000 bg-secondary ${!isRunning ? "bg-base-content/20" : ""}`} style={{ width: `${isRunning ? swapPct : Math.min(swapPct, 100)}%` }}></div>
                    </div>
                </div>
            </div>
            
          </div>

          {/* Configuration & Capabilities */}
          <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8 flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                <Settings size={14} /> Technical Parameters
            </h2>

            {/* Identitas */}
            <div className="bg-base-200 rounded-2xl p-5 border border-base-300 space-y-3 mb-6 shadow-inner">
                <div className="flex justify-between items-center py-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Virtual Type</span>
                    <span className="badge border-none tracking-widest uppercase text-[9px] font-black px-2 bg-info/20 text-info">
                        {data.type} Environment
                    </span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-base-300/50 pt-2 text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">HA Managed</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${data.ha.managed === 1 ? 'bg-success/20 text-success' : 'bg-base-300 text-base-content/60'}`}>
                        {data.ha.managed ? "True" : "Unmanaged"}
                    </span>
                </div>
            </div>

            {/* Resource allocation */}
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-3">
                  Quotas Matrix
                </p>
                <div className="space-y-1">
                    {[
                        ["Logic Cores", `${data.cpus} cores`],
                        ["Maximum RAM", formatBytes(data.maxmem)],
                        ["Maximum Swap", formatBytes(data.maxswap)],
                        ["Storage Frame", formatBytes(data.maxdisk)],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm py-2 border-b border-base-200 last:border-0 hover:bg-base-200 transition-colors px-2 rounded-lg">
                            <span className="text-[11px] font-black uppercase tracking-widest opacity-50">{k}</span>
                            <span className="font-mono font-bold text-xs">{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Network totals — hanya saat running */}
            {isRunning && (
              <div className="mb-6">
                 <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-3 flex items-center gap-1.5">
                  <Network size={12} /> Network Total Log
                </p>
                <div className="space-y-1">
                    {[
                        ["Inbound Accumulate", formatBytes(data.netin)],
                        ["Outbound Accumulate", formatBytes(data.netout)],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm py-2 border-b border-base-200 last:border-0 hover:bg-base-200 transition-colors px-2 rounded-lg">
                            <span className="text-[11px] font-black uppercase tracking-widest opacity-50">{k}</span>
                            <span className="font-mono font-bold text-xs">{v}</span>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {/* Call to action ketika mati */}
            {!isRunning && (
               <div className="bg-success/5 border border-success/20 rounded-2xl p-4 flex gap-3 items-center mt-auto shadow-sm">
                   <div className="bg-success/10 p-2 rounded-xl text-success shrink-0">
                      <Play size={16}/>
                   </div>
                   <p className="text-xs font-medium text-success/90 leading-snug">
                     Container dalam kondisi deaktifator. Silakan tekan tombol <b>Power On</b> untuk eksekusi hidup.
                   </p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}