"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Box, ArrowUp, ArrowDown, ArrowLeft, RefreshCw, Server, Cpu, HardDrive, LayoutTemplate, Activity, AlertTriangle, Terminal, Info, Clock, CheckCircle2 } from "lucide-react";

interface NodeStatus {
  uptime: number;
  cpu: number;
  wait: number;
  idle: number;
  loadavg: string[];
  kversion: string;
  pveversion: string;
  "boot-info": { mode: string };
  memory: { total: number; used: number; free: number };
  swap: { total: number; used: number; free: number };
  rootfs: { total: number; used: number; free: number; avail: number };
  ksm: { shared: number };
  cpuinfo: {
    model: string;
    sockets: number;
    cores: number;
    cpus: number;
    mhz: string;
    hvm: string;
    flags: string;
  };
  "current-kernel": {
    sysname: string;
    release: string;
    version: string;
    machine: string;
  };
}

interface VMItem {
  vmid: number | string;
  name: string;
  status: string;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  cpu: number;
  cpus: number;
  uptime: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
  type?: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
}

function usagePct(used: number, total: number) {
  if (!total) return 0;
  return Math.min(100, (used / total) * 100);
}

const REFRESH_INTERVAL = 5;

export default function NodeDetailPage() {
  const router = useRouter();
  const params = useParams<{
    workspace_id: string;
    proxmox_id: string;
    node_name: string;
  }>();

  const [data, setData] = useState<NodeStatus | null>(null);
  const [vms, setVms] = useState<VMItem[]>([]);
  const [cts, setCts] = useState<VMItem[]>([]);
  const [activeTab, setActiveTab] = useState<"spec" | "vm" | "ct">("spec");
  const [sortBy, setSortBy] = useState<"id" | "name">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchData = useCallback(async () => {
    try {
      const [resNode, resVm, resCt] = await Promise.all([
        fetch(`/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}`),
        fetch(`/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}/vm`),
        fetch(`/api/proxmox/${params.proxmox_id}/nodes/${params.node_name}/ct`),
      ]);
      
      if (!resNode.ok) throw new Error(`HTTP ${resNode.status}`);
      const jsonNode = await resNode.json();
      
      const jsonVm = resVm.ok ? await resVm.json() : { data: [] };
      const jsonCt = resCt.ok ? await resCt.json() : { data: [] };

      setData(jsonNode.data);
      setVms(jsonVm.data || []);
      setCts(jsonCt.data || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch node data");
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, [params.proxmox_id, params.node_name]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const cpuPct = data ? data.cpu * 100 : 0;
  const memPct = data ? usagePct(data.memory.used, data.memory.total) : 0;
  const diskPct = data ? usagePct(data.rootfs.used, data.rootfs.total) : 0;
  const swapPct = data ? usagePct(data.swap.used, data.swap.total) : 0;

  const getSortedItems = useCallback((items: VMItem[]) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "id") {
        comparison = Number(a.vmid) - Number(b.vmid);
      } else {
        comparison = (a.name || "").localeCompare(b.name || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [sortBy, sortOrder]);

  const sortedVms = useMemo(() => getSortedItems(vms), [vms, getSortedItems]);
  const sortedCts = useMemo(() => getSortedItems(cts), [cts, getSortedItems]);

  return (
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-72 pt-10 transition-all cursor-default pb-20">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
        
        {/* ─── HEADER ─── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
              <Link href={`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                  <ArrowLeft size={16} />
              </Link>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                  <span className="inline-block h-px w-6 bg-primary"></span>
                  Physical Node Details
              </p>
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
            <div>
                <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-2 flex items-center gap-4">
                  Target <span className="text-primary">{params.node_name}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {loading && !data ? (
                    <div className="loading loading-dots loading-sm opacity-50"></div>
                  ) : error ? (
                    <div className="badge badge-error gap-1.5 font-bold uppercase text-[10px] tracking-widest px-3 py-3 border-none animate-pulse">
                      <AlertTriangle size={12} /> Unreachable
                    </div>
                  ) : (
                    <div className="badge bg-success/15 text-success gap-2 font-black uppercase text-[10px] tracking-widest px-4 py-3 border-none flex items-center">
                      <span className="w-2 h-2 rounded-full bg-success animate-ping"></span> Live Online
                    </div>
                  )}
                  {data && (
                    <div className="badge bg-base-100 border-base-300 gap-1.5 font-bold text-[10px] uppercase tracking-widest py-3 shadow-sm text-base-content/60">
                      <Server size={12} /> {data.pveversion}
                    </div>
                  )}
                </div>
            </div>

            {/* Refresh Widget Premium */}
            <div className="flex items-center gap-3 bg-base-100 p-2 rounded-3xl border border-base-300 shadow-sm">
                <div className="flex items-center gap-4 px-4 border-r border-base-200">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-base-content/30 uppercase tracking-widest">
                      Refresh In
                    </span>
                    <span className="text-sm font-black tracking-tighter text-primary">
                      {countdown}s
                    </span>
                  </div>
                  <div
                    className="radial-progress text-primary transition-all duration-1000"
                    style={{
                      "--value": ((countdown / REFRESH_INTERVAL) * 100).toFixed(0),
                      "--size": "2rem",
                      "--thickness": "4px",
                    } as React.CSSProperties}
                  >
                  </div>
                </div>
                <button
                  onClick={() => { setLoading(true); fetchData(); }}
                  disabled={loading}
                  className="btn btn-circle btn-ghost text-base-content/60 hover:text-primary hover:bg-primary/10"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
          </div>
        </div>

        {error && (
            <div className="alert alert-error bg-error/10 border-error/20 text-error rounded-3xl shadow-sm">
                <AlertTriangle size={24} />
                <div>
                  <h3 className="font-black tracking-tight text-lg">Connection Failure</h3>
                  <p className="text-xs font-medium opacity-80">{error}</p>
                </div>
                <button onClick={fetchData} className="btn btn-sm btn-error shadow-sm">Retry Request</button>
            </div>
        )}

        {/* ─── Skeleton ─── */}
        {loading && !data && (
            <div className="space-y-8 animate-pulse">
              <div className="h-16 bg-base-300/50 rounded-2xl w-full max-w-lg mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="h-64 bg-base-300/50 rounded-[2rem]"></div>
                <div className="h-64 bg-base-300/50 rounded-[2rem] lg:col-span-2"></div>
              </div>
            </div>
        )}

        {/* ─── Dashboard content ─── */}
        {data && (
          <div className="space-y-8">

            {/* Premium Tab Controller */}
            <div className="flex gap-2 bg-base-100 p-2 rounded-2xl border border-base-300 w-full overflow-x-auto shadow-sm">
                {(
                  [
                    { id: "spec", label: "Spesifikasi Node", icon: <Info size={14} />, badge: null },
                    { id: "vm", label: "Virtual Guests", icon: <Monitor size={14} />, badge: vms.length },
                    { id: "ct", label: "LXC Containers", icon: <Box size={14} />, badge: cts.length }
                  ] as { id: typeof activeTab, label: string, icon: any, badge: number | null }[]
                ).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex-1 flex items-center justify-center gap-3 px-6 py-4 text-xs font-black uppercase
                            tracking-widest rounded-xl whitespace-nowrap transition-all duration-300
                            ${activeTab === tab.id
                                ? 'bg-primary text-primary-content shadow-lg shadow-primary/20'
                                : 'text-base-content/50 hover:text-base-content hover:bg-base-200/50'}
                        `}
                    >
                        <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-50'}>{tab.icon}</span>
                        {tab.label}
                        {tab.badge !== null && (
                            <span className={`
                                text-[10px] font-black px-2 py-0.5 rounded-full ml-1
                                ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-base-300 text-base-content/50'}
                            `}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* TAB: SPESIFIKASI */}
            {activeTab === "spec" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">

                {/* Quick stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(
                    [
                      {
                        label: "System Uptime",
                        value: formatUptime(data.uptime),
                        color: "primary",
                        icon: <Clock size={20} />
                      },
                      {
                        label: "CPU Threads",
                        value: `${data.cpuinfo.cores}C / ${data.cpuinfo.cpus}T`,
                        color: "info",
                        icon: <Cpu size={20} />
                      },
                      {
                        label: "Boot Architecture",
                        value: data["boot-info"].mode.toUpperCase(),
                        color: "warning",
                        icon: <Terminal size={20} />
                      },
                      {
                        label: "Virtualization (HVM)",
                        value: data.cpuinfo.hvm === "1" ? "Enabled" : "Disabled",
                        color: data.cpuinfo.hvm === "1" ? "success" : "error",
                        icon: <CheckCircle2 size={20} />
                      },
                    ] as const
                  ).map((stat) => (
                    <div key={stat.label} className="bg-base-100 border border-base-300 rounded-[2rem] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group overflow-hidden relative">
                      <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-${stat.color}`}>
                          {stat.icon}
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-${stat.color}/10 text-${stat.color} shadow-inner`}>
                          {stat.icon}
                      </div>
                      <p className="text-[9px] font-black text-base-content/40 uppercase tracking-widest mb-1">
                        {stat.label}
                      </p>
                      <p className="font-black text-xl tracking-tighter leading-none">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Radial gauges Card */}
                  <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8">
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-8 flex items-center gap-2">
                        <Activity size={14} /> Resource Load
                    </h2>
                    <div className="flex justify-around items-center mb-8">
                        {/* Custom Radial Implementation without relying purely on daisyUI helper if it's too simple */}
                        {[
                            { val: cpuPct, label: 'CPU', color: cpuPct > 80 ? 'text-error' : 'text-primary' },
                            { val: memPct, label: 'Memory', color: memPct > 85 ? 'text-error' : 'text-info' },
                            { val: diskPct, label: 'Disk', color: diskPct > 90 ? 'text-error' : 'text-secondary' },
                        ].map(g => (
                            <div key={g.label} className="flex flex-col items-center gap-3">
                                <div className={`radial-progress ${g.color} transition-all duration-1000`} 
                                     style={{ "--value": g.val, "--size": "5rem", "--thickness": "6px" } as React.CSSProperties}>
                                    <span className="font-black text-sm">{g.val.toFixed(0)}%</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{g.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="divider opacity-30"></div>
                    <div className="text-center mt-6">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3">Load Average</p>
                        <div className="flex justify-center gap-6">
                          {data.loadavg.map((la, i) => (
                              <div key={i} className="bg-base-200 px-4 py-2 rounded-xl border border-base-300 text-center shadow-inner">
                                  <p className="font-black text-base tracking-tighter">{la}</p>
                                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 mt-0.5">{["1M", "5M", "15M"][i]}</p>
                              </div>
                          ))}
                        </div>
                    </div>
                  </div>

                  {/* Progress bars Card */}
                  <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8 lg:col-span-2">
                    <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-8 flex items-center gap-2">
                        <Server size={14} /> Detailed Hardware Metrics
                    </h2>

                    <div className="space-y-8">
                        {/* CPU */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex justify-center items-center">
                                        <Cpu size={16}/>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">CPU Computing</span>
                                </div>
                                <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                    {cpuPct.toFixed(1)}% Usage &middot; {parseFloat(data.cpuinfo.mhz).toFixed(0)} MHz
                                </span>
                            </div>
                            <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                                <div className={`h-full rounded-full transition-all duration-1000 ${cpuPct > 80 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${cpuPct}%` }}></div>
                            </div>
                            <p className="text-[10px] opacity-40 font-mono italic tracking-tight">{data.cpuinfo.model}</p>
                        </div>

                        {/* Memory */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-xl bg-info/10 text-info flex justify-center items-center">
                                        <LayoutTemplate size={16}/>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">RAM Allocation</span>
                                </div>
                                <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                    {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
                                </span>
                            </div>
                            <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                                <div className={`h-full rounded-full transition-all duration-1000 ${memPct > 85 ? 'bg-error' : 'bg-info'}`} style={{ width: `${memPct}%` }}></div>
                            </div>
                        </div>

                        {/* Root FS */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex justify-center items-center">
                                        <HardDrive size={16}/>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Root Filesystem</span>
                                </div>
                                <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                    {formatBytes(data.rootfs.used)} / {formatBytes(data.rootfs.total)} ({formatBytes(data.rootfs.avail)} Avail)
                                </span>
                            </div>
                            <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                                <div className={`h-full rounded-full transition-all duration-1000 ${diskPct > 90 ? 'bg-error' : 'bg-secondary'}`} style={{ width: `${diskPct}%` }}></div>
                            </div>
                        </div>
                        
                        {/* Swap */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex justify-center items-center">
                                        <ArrowUp size={16}/>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Swap Memory</span>
                                </div>
                                <span className="text-[10px] font-bold opacity-80 bg-base-200 px-2 py-1 rounded-lg">
                                    {formatBytes(data.swap.used)} / {formatBytes(data.swap.total)}
                                </span>
                            </div>
                            <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden border border-base-300/50">
                                <div className={`h-full rounded-full transition-all duration-1000 bg-accent`} style={{ width: `${Math.max(swapPct, 0)}%` }}></div>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>

                {/* System info & CPU Flags */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* System Information */}
                    <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8">
                        <h2 className="text-xs font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                            <Terminal size={14} /> System Information
                        </h2>
                        <div className="space-y-3">
                            {(
                                [
                                ["PVE Version", data.pveversion],
                                ["Kernel Release", data["current-kernel"].release],
                                ["Arch OS", `${data["current-kernel"].sysname} ${data["current-kernel"].machine}`],
                                ["CPU Model", data.cpuinfo.model],
                                ["KSM Shared", formatBytes(data.ksm.shared)],
                                ] as [string, string][]
                            ).map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-3 border-b border-base-200 last:border-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{k}</span>
                                    <span className="text-[11px] font-mono bg-base-200 px-3 py-1.5 rounded-lg border border-base-300 font-bold max-w-[200px] truncate">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CPU Flags */}
                    <div className="bg-base-100 border border-base-300 rounded-[2rem] shadow-sm p-8">
                        <div className="flex items-center justify-between gap-2 mb-6">
                            <h2 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                                <Cpu size={14} /> CPU Flags Config
                            </h2>
                            <div className="bg-base-200 text-xs font-black px-3 py-1 rounded-xl">
                                {data.cpuinfo.flags.split(" ").length} Flags
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-56 pr-2 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300">
                            {data.cpuinfo.flags.split(" ").map((flag) => (
                                <span key={flag} className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest bg-base-200 border border-base-300 rounded-md opacity-70 hover:opacity-100 hover:text-primary transition-colors cursor-default">
                                    {flag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

              </div>
            )}

            {/* TAB: VIRTUAL GUESTS */}
            {(activeTab === "vm" || activeTab === "ct") && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary p-2 rounded-xl">
                            {activeTab === "vm" ? <Monitor size={20} /> : <Box size={20} />}
                        </div>
                        <h2 className="text-xl font-black tracking-tighter leading-none">
                            {activeTab === "vm" ? `Virtual Machines (${vms.length})` : `LXC Containers (${cts.length})`}
                        </h2>
                    </div>
                    {((activeTab === "vm" ? vms : cts).length > 0) && (
                        <div className="flex items-center gap-3 bg-base-100 p-1 rounded-xl border border-base-300 shadow-sm">
                            <select
                                className="select select-sm select-ghost font-bold text-[10px] uppercase tracking-widest focus:bg-transparent"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as "id" | "name")}
                            >
                                <option value="id">Sort ID</option>
                                <option value="name">Sort Name</option>
                            </select>
                            <button
                                className="btn btn-square btn-sm btn-ghost hover:bg-base-200"
                                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            >
                                {sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </button>
                        </div>
                    )}
                </div>

                {((activeTab === "vm" ? sortedVms : sortedCts).length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {(activeTab === "vm" ? sortedVms : sortedCts).map((machine) => {
                            const isRunning = machine.status === 'running';
                            const memUsage = ((machine.mem ?? 0) / (machine.maxmem ?? 1)) * 100;
                            const cpuUsage = (machine.cpu ?? 0) * 100;

                            return (
                                <div 
                                    key={machine.vmid}
                                    onClick={() => router.push(`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes/${params.node_name}/${activeTab === "vm" ? "vm" : "ct"}/${machine.vmid}`)}
                                    className={`relative overflow-hidden bg-base-100 border rounded-[2rem] p-6 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-xl ${
                                        isRunning ? 'border-base-300 hover:border-primary/40 hover:shadow-primary/5' : 'border-base-300 opacity-80 hover:border-error/40'
                                    }`}
                                >
                                    {isRunning && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success/0 via-success/50 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-2xl border transition-colors shadow-inner flex items-center justify-center ${
                                                 isRunning ? 'bg-success/10 text-success border-success/20' : 'bg-base-200 text-base-content/30 border-base-300'
                                            }`}>
                                                {activeTab === "vm" ? <Monitor size={22} /> : <Box size={22} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-black bg-base-200 border border-base-300 px-2 py-0.5 rounded-md opacity-60 uppercase tracking-widest">
                                                        ID: {machine.vmid}
                                                    </span>
                                                    {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>}
                                                </div>
                                                <h3 className="font-black text-lg truncate w-32 md:w-36 uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
                                                    {machine.name || 'Unnamed'}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                isRunning ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                            }`}>
                                                {machine.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`space-y-4 mb-6 transition-opacity ${!isRunning && 'opacity-40 mix-blend-luminosity'}`}>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                                <span className="flex items-center gap-1"><Cpu size={12}/> CPU Load</span>
                                                <span>{isRunning ? `${cpuUsage.toFixed(1)}%` : '0%'}</span>
                                            </div>
                                            <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden border border-base-300/50">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${cpuUsage > 80 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${isRunning ? cpuUsage : 0}%` }}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                                <span className="flex items-center gap-1"><LayoutTemplate size={12}/> Memory</span>
                                                <span>{isRunning ? `${formatBytes(machine.mem ?? 0)} / ${formatBytes(machine.maxmem ?? 0)}` : '-'}</span>
                                            </div>
                                            <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden border border-base-300/50">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${memUsage > 85 ? 'bg-error' : 'bg-info'}`} style={{ width: `${isRunning ? memUsage : 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-5 border-t border-base-200">
                                        <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">
                                            {isRunning ? `UP: ${formatUptime(machine.uptime ?? 0)}` : 'Offline'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-ghost bg-base-200/50 rounded-xl font-black uppercase tracking-widest text-[9px] px-3 border-none shadow-sm h-8 min-h-8" onClick={(e) => { e.stopPropagation(); }}>
                                                Console
                                            </button>
                                            <button className={`btn rounded-xl font-black uppercase tracking-widest text-[9px] px-4 shadow-sm h-8 min-h-8 border-none ${
                                                isRunning ? 'bg-error/10 text-error hover:bg-error hover:text-white' : 'bg-success text-white hover:bg-success/90'
                                            }`} onClick={(e) => { e.stopPropagation(); }}>
                                                {isRunning ? 'Stop' : 'Start'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 bg-base-100/50 rounded-[3rem] border-2 border-dashed border-base-300 opacity-60">
                        <div className="bg-base-200 p-6 rounded-full mb-6 text-primary/40">
                            {activeTab === "vm" ? <Monitor size={48} /> : <Box size={48} />}
                        </div>
                        <h3 className="font-black text-2xl tracking-tight uppercase opacity-40 mb-2">Empty Area</h3>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">No {activeTab === "vm" ? 'Virtual Machines' : 'Containers'} deployed on this node.</p>
                    </div>
                )}
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}