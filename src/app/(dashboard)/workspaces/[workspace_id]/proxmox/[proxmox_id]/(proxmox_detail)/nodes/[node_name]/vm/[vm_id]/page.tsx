// page.tsx

"use client";

import React, { useEffect, useState, use } from "react";
import {
  Cpu, MemoryStick, HardDrive, Activity,
  ArrowUpCircle, ArrowDownCircle, Settings,
  Zap, Monitor, Clock, Play, AlertTriangle, ArrowLeft, Terminal, RefreshCw, PowerOff, RotateCcw, Pause, PlayCircle, RefreshCcw
} from "lucide-react";
import Link from 'next/link';
import dynamic from 'next/dynamic';

const NoVncConsole = dynamic(() => import('@/src/components/proxmox/NoVncConsole'), { ssr: false });

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
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
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
        <h3 className="font-black tracking-tight text-lg">Virtual Machine Offline</h3>
        <p className="text-xs font-medium opacity-80">
          Metrik instruksi load tidak tersedia saat status mesin mati. Hanya konfigurasi spesifikasi inti yang ditampilkan.
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
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: string, actionName: string} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const REFRESH_INTERVAL = 5;
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [proxmoxHost, setProxmoxHost] = useState<{ host: string; port: number } | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    const fetchProxmoxData = async () => {
      try {
        const res = await fetch(`/api/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}`);
        if (res.ok) {
          const pData = await res.json();
          if (pData.proxmox_host) {
            setProxmoxHost({ host: pData.proxmox_host, port: pData.proxmox_port || 8006 });
          }
        }
      } catch (err) {
        console.error("Failed to fetch Proxmox data:", err);
      }
    };
    fetchProxmoxData();
  }, [params.workspace_id, params.proxmox_id]);

  const handleOpenConsole = () => {
    if (!proxmoxHost || !data) return;
    setShowConsole(true);
  };

  const fetchStatus = async (isInitial = false) => {
    if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  };

  const handlePowerAction = async (action: string, actionName: string, requireConfirm: boolean = true) => {
    if (requireConfirm) {
      setConfirmModal({ isOpen: true, action, actionName });
      return;
    }
    await executePowerAction(action, actionName);
  };

  const executePowerAction = async (action: string, actionName: string) => {
    setActionLoading(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}/vm/${params.vm_id}/power/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchStatus(true);
      } else {
        const err = await res.json();
        alert(`Failed to ${actionName}: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(`Failed to ${actionName} VM:`, error);
      alert(`Failed to ${actionName} VM`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [params.proxmox_id, params.node_name, params.vm_id]);

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
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] opacity-40 animate-pulse">Syncing VM Data...</p>
        </div>
    );

  if (!data)
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 pt-20 lg:pl-72">
             <div className="alert alert-error bg-error/10 border-error/20 text-error rounded-3xl shadow-sm max-w-lg">
                <AlertTriangle size={24} />
                <div>
                  <h3 className="font-black tracking-tight text-lg">Not Found</h3>
                  <p className="text-xs font-medium opacity-80">Data Virtual Machine tidak ditemukan atau Anda tidak memiliki akses.</p>
                </div>
            </div>
        </div>
    );

  const isRunning = data.status === "running";

  return (
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-72 pt-16 transition-all cursor-default pb-20">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
              <Link href={`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes/${params.node_name}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                  <ArrowLeft size={16} />
              </Link>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                  <span className="inline-block h-px w-6 bg-primary"></span>
                  Virtual Machine
              </p>
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
            <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-3xl border shadow-inner flex items-center justify-center shrink-0 ${isRunning ? 'bg-success/10 text-success border-success/20' : 'bg-base-200 text-base-content/30 border-base-300'}`}>
                    <Monitor size={40} />
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
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-base-100 p-2 md:p-1.5 rounded-2xl md:rounded-3xl border border-base-300 shadow-sm mr-2">
                    <button 
                        onClick={handleOpenConsole}
                        disabled={!proxmoxHost || data.status !== "running"}
                        className="btn btn-primary rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-[10px] px-4 md:px-6 shadow-sm shadow-primary/20 border-none gap-2"
                    >
                        {proxmoxHost ? <Terminal size={14}/> : <span className="loading loading-spinner loading-xs"></span>}
                        Console
                    </button>
                    {data.status === "stopped" ? (
                      <button onClick={() => handlePowerAction("start", "Power On")} disabled={actionLoading} className="btn rounded-xl md:rounded-2xl btn-success text-white font-black tracking-widest uppercase text-[9px] md:text-[10px] px-4 md:px-6 shadow-sm shadow-success/20 border-none">
                        {actionLoading ? <span className="loading loading-spinner loading-xs mr-1"></span> : <Play size={14} className="mr-1"/>} Power On
                      </button>
                    ) : data.qmpstatus === "paused" ? (
                      <>
                        <button onClick={() => handlePowerAction("resume", "Resume")} disabled={actionLoading} className="btn btn-info gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 text-white shadow-sm shadow-info/20 border-none">
                          {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : <PlayCircle size={14}/>} Resume
                        </button>
                        <button onClick={() => handlePowerAction("stop", "Stop")} disabled={actionLoading} className="btn btn-error gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 text-white shadow-sm shadow-error/20 border-none">
                          <Zap size={14}/> Stop
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handlePowerAction("suspend", "Suspend")} disabled={actionLoading} className="btn btn-info gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 text-white shadow-sm shadow-info/20 border-none">
                          {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : <Pause size={14}/>} Suspend
                        </button>
                        <button onClick={() => handlePowerAction("reboot", "Reboot")} disabled={actionLoading} className="btn btn-warning gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 text-warning-content shadow-sm shadow-warning/20 border-none">
                          <RotateCcw size={14}/> Reboot
                        </button>
                        <button onClick={() => handlePowerAction("reset", "Reset")} disabled={actionLoading} className="btn bg-error/10 hover:bg-error/20 text-error gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 border-none shadow-sm">
                          <RefreshCcw size={14}/> Reset
                        </button>
                        <button onClick={() => handlePowerAction("shutdown", "Shutdown")} disabled={actionLoading} className="btn bg-base-200 hover:bg-base-300 text-base-content gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 border-none shadow-sm">
                          <PowerOff size={14}/> Shutdown
                        </button>
                        <button onClick={() => handlePowerAction("stop", "Stop")} disabled={actionLoading} className="btn btn-error gap-1 font-black tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl px-4 md:px-5 text-white shadow-sm shadow-error/20 border-none">
                          <Zap size={14}/> Stop
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
            title="Computing Engine"
            value={isRunning ? `${(data.cpu * 100).toFixed(1)}%` : "0%"}
            subValue={`${data.cpus} vCPU Logic Cores`}
            icon={<Cpu size={12} />}
            color="blue"
            progress={isRunning ? data.cpu * 100 : 0}
            disabled={!isRunning}
          />
          <MetricCard
            title="Memory Usage"
            value={isRunning ? formatBytes(data.mem) : "0 B"}
            subValue={`of ${formatBytes(data.maxmem)} Allocated`}
            icon={<MemoryStick size={12} />}
            color="purple"
            progress={isRunning ? (data.mem / data.maxmem) * 100 : 0}
            disabled={!isRunning}
          />
          <MetricCard
            title="Network Traffic"
            value={isRunning ? formatBytes(data.netin + data.netout) : "0 B"}
            subValue={`In: ${formatBytes(data.netin)} / Out: ${formatBytes(data.netout)}`}
            icon={<Activity size={12} />}
            color="orange"
            disabled={!isRunning}
          />
          <MetricCard
            title="Virtual Uptime"
            value={formatUptime(data.uptime)}
            subValue={isRunning && data.pid ? `System PID: ${data.pid}` : "Machine Offline"}
            icon={<Clock size={12} />}
            color="emerald"
            disabled={!isRunning}
          />
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Disk Statistics */}
          <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8 lg:col-span-2">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-8 flex items-center gap-2">
                <HardDrive size={14} /> Storage Drive Analytics
            </h2>

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

            <div className="divider opacity-30 text-[9px] font-black uppercase tracking-widest">
                {isRunning ? "Running Block Devices" : "Offline Storage Summary"}
            </div>

            {isRunning && data.blockstat && Object.keys(data.blockstat).length > 0 ? (
              <div className="overflow-x-auto mt-4">
                <table className="table w-full">
                  <thead className="bg-base-200/50 text-[10px] font-black uppercase tracking-widest opacity-50 border-b border-base-300">
                    <tr>
                      <th className="py-4 pl-6">Drive Mount</th>
                      <th>Read Op/s</th>
                      <th>Write Op/s</th>
                      <th className="pr-6 text-right">Highest Offset</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold">
                    {Object.entries(data.blockstat).map(([key, val]) => (
                      <tr key={key} className="border-b border-base-200 last:border-0 hover:bg-base-200/50 transition-colors">
                        <td className="pl-6 py-4">
                            <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">{key}</span>
                        </td>
                        <td>{val.rd_operations?.toLocaleString() ?? "—"}</td>
                        <td>{val.wr_operations?.toLocaleString() ?? "—"}</td>
                        <td className="pr-6 text-right font-mono opacity-60">
                          {formatBytes(val.wr_highest_offset ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
                <div className="space-y-3 mt-6">
                  {/* Progress Allocated Disk */}
                  <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-end mb-1">
                          <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Virtual Disk Quota</span>
                          <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                              {formatBytes(data.disk)} / {formatBytes(data.maxdisk)}
                          </span>
                      </div>
                      <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                          <div className={`h-full rounded-full bg-base-content/20`} style={{ width: `${Math.min((data.disk/data.maxdisk)*100, 100)}%` }}></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-base-200 px-5 py-4 rounded-2xl flex justify-between items-center border border-base-300">
                          <span className="text-[10px] font-black tracking-widest uppercase opacity-40">HA Managed</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${data.ha.managed === 1 ? 'bg-success/20 text-success' : 'bg-base-300 text-base-content/60'}`}>
                             {data.ha.managed === 1 ? "Enabled" : "Unmanaged"}
                          </span>
                      </div>
                      <div className="bg-base-200 px-5 py-4 rounded-2xl flex justify-between items-center border border-base-300">
                          <span className="text-[10px] font-black tracking-widest uppercase opacity-40">QEMU Agent</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${data.agent === 1 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                             {data.agent === 1 ? "Active" : "Disabled"}
                          </span>
                      </div>
                  </div>
                </div>
            )}
          </div>

          {/* Configuration & Capabilities */}
          <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8 flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                <Settings size={14} /> Virtual Configuration
            </h2>

            <div className="bg-base-200 rounded-2xl p-5 border border-base-300 space-y-3 mb-6 shadow-inner">
                <div className="flex justify-between items-center py-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">QMP State</span>
                    <span className={`badge border-none tracking-widest uppercase text-[9px] font-black px-2 ${isRunning ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                        {data.qmpstatus}
                    </span>
                </div>
                {isRunning && data["running-qemu"] && (
                    <div className="flex justify-between items-center py-1 border-t border-base-300/50 pt-2 text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">QEMU Engine</span>
                        <span className="text-[10px] font-mono font-bold bg-base-300 px-2 rounded-md">{data["running-qemu"]}</span>
                    </div>
                )}
                {isRunning && data["running-machine"] && (
                    <div className="flex justify-between items-center py-1 border-t border-base-300/50 pt-2 text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Machine Type</span>
                        <span className="text-[10px] font-mono font-bold bg-base-300 px-2 rounded-md truncate max-w-[120px]">{data["running-machine"]}</span>
                    </div>
                )}
            </div>

            {/* PBS Support — hanya saat running */}
            {isRunning && data["proxmox-support"] && (
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-3">
                  Backup Capabilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data["proxmox-support"])
                    .filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
                    .map(([key, val]) => (
                      <div key={key} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-base-200 px-2.5 py-1.5 rounded-lg border border-base-300 transition-colors ${val ? "text-base-content hover:border-warning/50" : "opacity-40"}`}>
                        <Zap size={10} className={val ? "text-warning" : "opacity-30"} />
                        {key.replace("pbs-", "")}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Balloon memory — hanya saat running */}
            {isRunning && data.freemem !== undefined && (
              <div className="mt-auto">
                <div className="space-y-2 pt-6 border-t border-base-200">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex gap-2 items-center">
                            <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Balloon RAM</span>
                        </div>
                        <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                            {formatBytes(data.freemem)} Free
                        </span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                        <div className={`h-full rounded-full transition-all duration-1000 bg-secondary`} style={{ width: `${(data.freemem / data.maxmem) * 100}%` }}></div>
                    </div>
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
                     Virtual Machine dalam kondisi mati. Silakan tekan tombol <b>Power On</b> untuk mengaktifkannya kembali.
                   </p>
               </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Console Modal (Iframe) ── */}
      {showConsole && proxmoxHost && data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-base-100 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-base-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-base-200 border-b border-base-300">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="opacity-50" />
                <h3 className="font-bold tracking-wide">Console: {data.name}</h3>
                <div className="badge badge-sm badge-ghost opacity-50 ml-2">ID: {data.vmid}</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const iframe = document.getElementById('proxmox-console-iframe') as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="btn btn-sm btn-circle btn-ghost"
                  title="Reconnect"
                >
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={() => setShowConsole(false)}
                  className="btn btn-sm btn-circle btn-ghost text-error"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Modal Body / NoVncConsole */}
            <div className="flex-1 w-full bg-black relative rounded-b-3xl">
              <NoVncConsole 
                proxmoxId={params.proxmox_id}
                node={params.node_name}
                vmid={params.vm_id}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Power Confirmation Modal ── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="modal modal-open z-[200]">
          <div className="modal-box bg-base-100 rounded-3xl shadow-xl border border-base-300">
            <h3 className="font-black tracking-tight text-lg flex items-center gap-2 text-warning mb-4">
              <AlertTriangle size={24} />
              Confirm Action
            </h3>
            <p className="text-sm font-medium opacity-80 leading-relaxed">
              Are you sure you want to <strong>{confirmModal.actionName}</strong> the virtual machine <strong>{data?.name || "this VM"}</strong>? 
              <br/>This action may affect running services and operations.
            </p>
            <div className="modal-action mt-8">
              <button 
                className="btn btn-ghost rounded-2xl text-xs font-bold uppercase tracking-widest px-6"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-warning rounded-2xl text-xs font-black uppercase tracking-widest text-warning-content shadow-sm shadow-warning/20 border-none px-6"
                onClick={() => executePowerAction(confirmModal.action, confirmModal.actionName)}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="loading loading-spinner loading-xs mr-2"></span> : null} 
                Proceed
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40 backdrop-blur-[2px]" onClick={() => !actionLoading && setConfirmModal(null)}></div>
        </div>
      )}

    </div>
  );
}