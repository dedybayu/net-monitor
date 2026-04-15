"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Box, ArrowUp, ArrowDown } from "lucide-react";

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

function cpuProgressColor(pct: number) {
  if (pct > 80) return "progress-error";
  if (pct > 50) return "progress-warning";
  return "progress-success";
}

function memProgressColor(pct: number) {
  if (pct > 85) return "progress-error";
  if (pct > 65) return "progress-warning";
  return "progress-info";
}

function diskProgressColor(pct: number) {
  if (pct > 90) return "progress-error";
  if (pct > 70) return "progress-warning";
  return "progress-accent";
}

function RadialGauge({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`radial-progress ${colorClass} font-mono font-bold transition-all duration-500`}
        style={
          {
            "--value": value.toFixed(1),
            "--size": "5.5rem",
            "--thickness": "7px",
          } as React.CSSProperties
        }
        role="progressbar"
        aria-valuenow={value}
      >
        <span className="text-sm font-bold">{value.toFixed(1)}%</span>
      </div>
      <span className="text-[10px] font-mono text-base-content/40 tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
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

  // Auto-refresh every 5s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
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
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-20 lg:pl-64">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="breadcrumbs text-xs mb-1 text-base-content/40 font-mono">
            <ul>
              <li>Proxmox</li>
              <li>{params.proxmox_id}</li>
              <li className="text-base-content font-semibold">{params.node_name}</li>
            </ul>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold font-mono tracking-tight">
              {params.node_name}
            </h1>
            {!loading && !error && (
              <div className="badge badge-success gap-1.5">
                <span className="loading loading-ring loading-xs" />
                online
              </div>
            )}
            {error && <div className="badge badge-error">unreachable</div>}
          </div>
          {data && (
            <p className="text-sm text-base-content/40 font-mono mt-1">
              {data.pveversion}&ensp;·&ensp;up {formatUptime(data.uptime)}
            </p>
          )}
        </div>

        {/* Refresh widget */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl px-3 py-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-base-content/30 uppercase tracking-wide">
                next refresh
              </span>
              <span className="text-xs font-mono font-bold text-primary">
                {countdown}s
              </span>
            </div>
            <div
              className="radial-progress text-primary"
              style={
                {
                  "--value": ((countdown / REFRESH_INTERVAL) * 100).toFixed(0),
                  "--size": "2.2rem",
                  "--thickness": "3px",
                } as React.CSSProperties
              }
            >
              <span className="text-[9px] font-mono">{countdown}</span>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            disabled={loading}
            className="btn btn-sm btn-square btn-ghost border border-base-300"
            title="Refresh now"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Error alert ─── */}
      {error && (
        <div role="alert" className="alert alert-error mb-5">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono text-sm">{error}</span>
          <button onClick={fetchData} className="btn btn-sm btn-ghost">Retry</button>
        </div>
      )}

      {/* ─── Skeleton loader ─── */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="skeleton h-56 rounded-2xl" />
            <div className="skeleton h-56 rounded-2xl lg:col-span-2" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </div>
      )}

      {/* ─── Dashboard content ─── */}
      {data && (
        <div className="space-y-4">

          {/* Tabs Navigation */}
          <div className="tabs tabs-boxed bg-base-100 border border-base-300 w-fit">
            <button
              onClick={() => setActiveTab("spec")}
              className={`tab font-mono text-xs font-semibold ${activeTab === "spec" ? "tab-active" : ""}`}
            >
              Spesifikasi
            </button>
            <button
              onClick={() => setActiveTab("vm")}
              className={`tab font-mono text-xs font-semibold ${activeTab === "vm" ? "tab-active" : ""}`}
            >
              Virtual Machines
            </button>
            <button
              onClick={() => setActiveTab("ct")}
              className={`tab font-mono text-xs font-semibold ${activeTab === "ct" ? "tab-active" : ""}`}
            >
              LXC Containers
            </button>
          </div>

          {activeTab === "spec" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">

          {/* Row 1: Gauges + Detailed metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Radial gauges */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-6">
                <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold mb-4">
                  Resource Usage
                </h2>
                <div className="flex justify-around items-center">
                  <RadialGauge
                    value={cpuPct}
                    label="CPU"
                    colorClass={cpuPct > 80 ? "text-error" : cpuPct > 50 ? "text-warning" : "text-success"}
                  />
                  <RadialGauge
                    value={memPct}
                    label="Memory"
                    colorClass={memPct > 85 ? "text-error" : memPct > 65 ? "text-warning" : "text-info"}
                  />
                  <RadialGauge
                    value={diskPct}
                    label="Disk"
                    colorClass={diskPct > 90 ? "text-error" : diskPct > 70 ? "text-warning" : "text-accent"}
                  />
                </div>

                <div className="divider my-3 text-[10px] font-mono text-base-content/30 uppercase tracking-widest">
                  Load Average
                </div>

                <div className="flex justify-around">
                  {data.loadavg.map((la, i) => (
                    <div key={i} className="text-center">
                      <p className="font-mono font-bold text-lg">{la}</p>
                      <p className="text-[10px] text-base-content/40 font-mono uppercase">
                        {["1 min", "5 min", "15 min"][i]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div className="card bg-base-100 border border-base-300 shadow-sm lg:col-span-2">
              <div className="card-body p-6 gap-5">
                <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold">
                  Detailed Metrics
                </h2>

                {/* CPU */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-success/15 text-success flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold">CPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-ghost badge-sm font-mono">
                        {data.cpuinfo.cores}c / {data.cpuinfo.cpus}t
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {cpuPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <progress
                    className={`progress ${cpuProgressColor(cpuPct)} w-full h-2.5 transition-all duration-500`}
                    value={cpuPct} max={100}
                  />
                  <p className="text-[11px] text-base-content/30 font-mono truncate">
                    {data.cpuinfo.model} &middot; {parseFloat(data.cpuinfo.mhz).toFixed(0)} MHz
                  </p>
                </div>

                {/* Memory */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-info/15 text-info flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 3H5a2 2 0 00-2 2v4m4-6h6m0 0h4a2 2 0 012 2v4M9 3v4m6-4v4M3 9h18M3 9v10a2 2 0 002 2h14a2 2 0 002-2V9" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold">Memory</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-ghost badge-sm font-mono">
                        {formatBytes(data.memory.free)} free
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
                      </span>
                    </div>
                  </div>
                  <progress
                    className={`progress ${memProgressColor(memPct)} w-full h-2.5 transition-all duration-500`}
                    value={memPct} max={100}
                  />
                  <p className="text-[11px] text-base-content/30 font-mono">
                    {memPct.toFixed(1)}% used
                  </p>
                </div>

                {/* Root FS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold">Root FS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-ghost badge-sm font-mono">
                        {formatBytes(data.rootfs.avail)} avail
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {formatBytes(data.rootfs.used)} / {formatBytes(data.rootfs.total)}
                      </span>
                    </div>
                  </div>
                  <progress
                    className={`progress ${diskProgressColor(diskPct)} w-full h-2.5 transition-all duration-500`}
                    value={diskPct} max={100}
                  />
                  <p className="text-[11px] text-base-content/30 font-mono">
                    {diskPct.toFixed(1)}% used
                  </p>
                </div>

                {/* Swap */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold">Swap</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-ghost badge-sm font-mono">
                        {formatBytes(data.swap.free)} free
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {formatBytes(data.swap.used)} / {formatBytes(data.swap.total)}
                      </span>
                    </div>
                  </div>
                  <progress
                    className={`progress progress-secondary w-full h-2.5 transition-all duration-500`}
                    value={Math.max(swapPct, 0.1)} max={100}
                  />
                  <p className="text-[11px] text-base-content/30 font-mono">
                    {swapPct.toFixed(1)}% used
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Quick stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                {
                  label: "Uptime",
                  value: formatUptime(data.uptime),
                  sub: "since last reboot",
                  color: "primary",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  label: "CPU Threads",
                  value: `${data.cpuinfo.cores}c / ${data.cpuinfo.cpus}t`,
                  sub: `${data.cpuinfo.sockets} socket(s)`,
                  color: "success",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 3H5a2 2 0 00-2 2v4m4-6h6m0 0h4a2 2 0 012 2v4M9 3v4m6-4v4M3 9h18M3 9v10a2 2 0 002 2h14a2 2 0 002-2V9" />
                    </svg>
                  ),
                },
                {
                  label: "Boot Mode",
                  value: data["boot-info"].mode.toUpperCase(),
                  sub: data["current-kernel"].machine,
                  color: "warning",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ),
                },
                {
                  label: "HVM",
                  value: data.cpuinfo.hvm === "1" ? "Enabled" : "Disabled",
                  sub: "hardware virtualization",
                  color: data.cpuinfo.hvm === "1" ? "info" : "error",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ),
                },
              ] as const
            ).map((stat) => (
              <div key={stat.label} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body p-4 gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center
                      bg-${stat.color}/10 text-${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-base-content/40 uppercase tracking-widest">
                      {stat.label}
                    </p>
                    <p className="font-bold font-mono text-lg leading-snug">{stat.value}</p>
                    <p className="text-[11px] text-base-content/40 font-mono">{stat.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 3: System info + CPU flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* System info table */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-5">
                <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold mb-2">
                  System Information
                </h2>
                <div className="overflow-x-auto">
                  <table className="table table-xs font-mono">
                    <tbody>
                      {(
                        [
                          ["PVE Version", data.pveversion],
                          ["Kernel Release", data["current-kernel"].release],
                          ["OS", data["current-kernel"].sysname],
                          ["Architecture", data["current-kernel"].machine],
                          ["Boot Mode", data["boot-info"].mode],
                          ["CPU Model", data.cpuinfo.model],
                          ["Sockets", String(data.cpuinfo.sockets)],
                          ["Frequency", `${parseFloat(data.cpuinfo.mhz).toFixed(0)} MHz`],
                          ["KSM Shared", formatBytes(data.ksm.shared)],
                        ] as [string, string][]
                      ).map(([k, v]) => (
                        <tr key={k} className="hover:bg-base-200/60 transition-colors">
                          <td className="text-base-content/40 w-1/3 py-2 align-top font-medium">
                            {k}
                          </td>
                          <td className="py-2 break-all text-base-content/80">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* CPU flags */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold">
                    CPU Flags
                  </h2>
                  <div className="badge badge-ghost badge-sm font-mono">
                    {data.cpuinfo.flags.split(" ").length}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-base-300">
                  {data.cpuinfo.flags.split(" ").map((flag) => (
                    <span
                      key={flag}
                      className="badge badge-outline badge-xs font-mono hover:badge-primary cursor-default transition-colors"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

          {activeTab === "vm" && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-base-content/60" />
                  <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold">
                    Virtual Machines ({vms.length})
                  </h2>
                </div>
                {vms.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered select-xs font-mono bg-base-100"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "id" | "name")}
                    >
                      <option value="id">Urut: ID</option>
                      <option value="name">Urut: Nama</option>
                    </select>
                    <button
                      className="btn btn-square btn-xs btn-outline border-base-300 bg-base-100"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? "Ascending" : "Descending"}
                    >
                      {sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    </button>
                  </div>
                )}
              </div>
              
              {sortedVms.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedVms.map((vm) => {
                    const isRunning = vm.status === 'running';
                    const memUsage = ((vm.mem ?? 0) / (vm.maxmem ?? 1)) * 100;
                    return (
                      <div 
                        key={vm.vmid}
                        onClick={() => router.push(`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes/${params.node_name}/vm/${vm.vmid}`)}
                        className="bg-base-100 border border-base-300 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3">
                                <div className={`p-3 rounded-2xl transition-colors ${isRunning ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/30'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black opacity-20 uppercase tracking-tighter">
                                            ID: {vm.vmid}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                                    </div>
                                    <h3 className="font-bold text-sm truncate w-40 uppercase tracking-tight leading-tight">
                                        {vm.name || 'Unnamed'}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black block opacity-30 uppercase tracking-tighter">{params.node_name}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isRunning ? 'text-success' : 'text-error'}`}>
                                    {vm.status}
                                </span>
                            </div>
                        </div>

                        <div className={`space-y-4 mb-6 transition-opacity ${!isRunning ? 'opacity-40' : ''}`}>
                            {/* CPU */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>CPU Load</span>
                                    <span>{isRunning ? `${((vm.cpu ?? 0) * 100).toFixed(1)}%` : '0%'}</span>
                                </div>
                                <progress
                                    className={`progress h-1.5 w-full ${isRunning ? 'progress-primary' : ''}`}
                                    value={isRunning ? (vm.cpu ?? 0) * 100 : 0}
                                    max="100"
                                />
                            </div>
                            {/* Memory */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>Memory</span>
                                    <span>{isRunning ? `${formatBytes(vm.mem ?? 0)} / ${formatBytes(vm.maxmem ?? 0)}` : 'Stopped'}</span>
                                </div>
                                <progress
                                    className={`progress h-1.5 w-full ${isRunning ? 'progress-info' : ''}`}
                                    value={isRunning ? memUsage : 0}
                                    max="100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-base-200">
                            <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                                {isRunning ? `UP: ${formatUptime(vm.uptime ?? 0)}` : 'Offline'}
                            </div>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                                    Console
                                </button>
                                <button className={`btn btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest px-3 ${isRunning ? 'btn-error btn-outline border-2' : 'btn-success text-white'}`} onClick={(e) => e.stopPropagation()}>
                                    {isRunning ? 'Stop' : 'Start'}
                                </button>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-base-100 rounded-xl border border-base-300">
                  <p className="text-base-content/50 text-sm">No Virtual Machines found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ct" && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Box size={16} className="text-base-content/60" />
                  <h2 className="text-[11px] font-mono text-base-content/40 uppercase tracking-widest font-semibold">
                    LXC Containers ({cts.length})
                  </h2>
                </div>
                {cts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered select-xs font-mono bg-base-100"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "id" | "name")}
                    >
                      <option value="id">Urut: ID</option>
                      <option value="name">Urut: Nama</option>
                    </select>
                    <button
                      className="btn btn-square btn-xs btn-outline border-base-300 bg-base-100"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? "Ascending" : "Descending"}
                    >
                      {sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    </button>
                  </div>
                )}
              </div>
              
              {sortedCts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedCts.map((ct) => {
                    const isRunning = ct.status === 'running';
                    const memUsage = ((ct.mem ?? 0) / (ct.maxmem ?? 1)) * 100;
                    return (
                      <div 
                        key={ct.vmid}
                        onClick={() => router.push(`/workspaces/${params.workspace_id}/proxmox/${params.proxmox_id}/nodes/${params.node_name}/ct/${ct.vmid}`)}
                        className="bg-base-100 border border-base-300 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3">
                                <div className={`p-3 rounded-2xl transition-colors ${isRunning ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/30'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black opacity-20 uppercase tracking-tighter">
                                            ID: {ct.vmid}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                                    </div>
                                    <h3 className="font-bold text-sm truncate w-40 uppercase tracking-tight leading-tight">
                                        {ct.name || 'Unnamed'}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black block opacity-30 uppercase tracking-tighter">{params.node_name}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isRunning ? 'text-success' : 'text-error'}`}>
                                    {ct.status}
                                </span>
                            </div>
                        </div>

                        <div className={`space-y-4 mb-6 transition-opacity ${!isRunning ? 'opacity-40' : ''}`}>
                            {/* CPU */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>CPU Load</span>
                                    <span>{isRunning ? `${((ct.cpu ?? 0) * 100).toFixed(1)}%` : '0%'}</span>
                                </div>
                                <progress
                                    className={`progress h-1.5 w-full ${isRunning ? 'progress-primary' : ''}`}
                                    value={isRunning ? (ct.cpu ?? 0) * 100 : 0}
                                    max="100"
                                />
                            </div>
                            {/* Memory */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>Memory</span>
                                    <span>{isRunning ? `${formatBytes(ct.mem ?? 0)} / ${formatBytes(ct.maxmem ?? 0)}` : 'Stopped'}</span>
                                </div>
                                <progress
                                    className={`progress h-1.5 w-full ${isRunning ? 'progress-info' : ''}`}
                                    value={isRunning ? memUsage : 0}
                                    max="100"
                                />
                            </div>
                            {/* Disk */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>Disk</span>
                                    <span>{isRunning ? `${formatBytes(ct.disk ?? 0)} / ${formatBytes(ct.maxdisk ?? 0)}` : 'Stopped'}</span>
                                </div>
                                <progress
                                    className={`progress h-1.5 w-full ${isRunning ? 'progress-accent' : ''}`}
                                    value={isRunning ? ((ct.disk ?? 0) / (ct.maxdisk ?? 1)) * 100 : 0}
                                    max="100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-base-200">
                            <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                                {isRunning ? `UP: ${formatUptime(ct.uptime ?? 0)}` : 'Offline'}
                            </div>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                                    Console
                                </button>
                                <button className={`btn btn-xs rounded-lg text-[9px] font-black uppercase tracking-widest px-3 ${isRunning ? 'btn-error btn-outline border-2' : 'btn-success text-white'}`} onClick={(e) => e.stopPropagation()}>
                                    {isRunning ? 'Stop' : 'Start'}
                                </button>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-base-100 rounded-xl border border-base-300">
                  <p className="text-base-content/50 text-sm">No Containers found</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-2 pb-4">
            <div className="loading loading-ring loading-xs text-primary opacity-40" />
            <p className="text-[11px] font-mono text-base-content/30">
              Auto-refreshing every {REFRESH_INTERVAL}s
              {lastUpdated && (
                <> &middot; last updated {lastUpdated.toLocaleTimeString()}</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}