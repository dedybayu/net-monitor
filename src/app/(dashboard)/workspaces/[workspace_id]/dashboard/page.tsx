'use client';

import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MonitoringTarget,
  Device,
  StatusApiResponse
} from '@/src/types/monitor';
import { 
    Activity, Server, Network, Clock, 
    CheckCircle, XCircle, ChevronRight, 
    AlertTriangle, Zap, ShieldCheck
} from 'lucide-react';

interface ApiError extends Error {
  status?: number;
}

const getFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Terjadi kesalahan') as ApiError;
    error.status = res.status;
    throw error;
  }
  return data;
};

const statusFetcher = async (key: [string, MonitoringTarget[]] | null): Promise<StatusApiResponse> => {
  if (!key) return { nodes: [] };
  const [url, payload] = key;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets: payload }),
  });
  if (!res.ok) throw new Error('Gagal mengambil data monitoring');
  return res.json();
};

export default function MonitorPage() {
  const params = useParams();
  const workspace_id = params?.workspace_id as string;
  const workspaceIdInt = parseInt(workspace_id, 10);
  const [countdown, setCountdown] = useState<number>(3);

  const { data: wsData, error: wsError, isLoading: wsLoading } = useSWR(
    workspaceIdInt ? `/api/workspaces/${workspaceIdInt}` : null,
    getFetcher
  );

  const { data: devices } = useSWR<Device[]>(
    wsData ? `/api/workspaces/${workspaceIdInt}/nodes` : null,
    getFetcher
  );

  const targetPayload = useMemo<MonitoringTarget[]>(() => {
    if (!devices) return [];
    return devices.map((d) => {
      if (d.target.includes(':')) {
        const [ip, port] = d.target.split(':');
        return { ip, port: parseInt(port, 10) };
      }
      return { ip: d.target, port: 0 };
    });
  }, [devices]);

  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    statusFetcher,
    {
      refreshInterval: 3000,
      onSuccess: () => setCountdown(3),
    }
  );

  const getDeviceData = (device: Device) => {
    const relatedNodes = apiData?.nodes.filter((n) => {
      const ipNode = n.target.split(':')[0];
      const ipDevice = device.target.split(':')[0];
      return ipNode === ipDevice;
    }) || [];

    if (relatedNodes.length === 0) return { status: 'unknown', latency: '---' };

    const onlineNode = relatedNodes.find((n) => n.status.toLowerCase() === 'online');
    if (onlineNode) return { status: 'online', latency: onlineNode.latency };

    return { status: 'offline', latency: 'N/A' };
  };

  const deviceStats = useMemo(() => {
    if (!devices || devices.length === 0) return { total: 0, online: 0, avgLatency: 0 };

    let online = 0;
    let totalLatency = 0;

    devices.forEach((device) => {
      const data = getDeviceData(device);
      if (data.status === 'online') {
        online++;
        const latencyValue = parseInt(data.latency);
        if (!isNaN(latencyValue)) totalLatency += latencyValue;
      }
    });

    return {
      total: devices.length,
      online,
      avgLatency: online > 0 ? Math.round(totalLatency / online) : 0
    };
  }, [devices, apiData]);

  const healthStatus = useMemo(() => {
    if (deviceStats.total === 0) return { label: 'No Data', color: 'text-base-content/50', bg: 'bg-base-200', icon: <AlertTriangle size={32} /> };
    if (deviceStats.online === deviceStats.total) return { label: 'Healthy', color: 'text-success', bg: 'bg-success/10', icon: <ShieldCheck size={32} /> };
    if (deviceStats.online === 0) return { label: 'Down', color: 'text-error', bg: 'bg-error/10', icon: <XCircle size={32} /> };
    return { label: 'Issues Found', color: 'text-warning', bg: 'bg-warning/10', icon: <AlertTriangle size={32} /> };
  }, [deviceStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 3 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (wsLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-4 pt-16 lg:pl-72 z-1 relative">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="mt-2 text-[10px] font-black tracking-[0.35em] uppercase opacity-40 animate-pulse">Initializing Data...</p>
    </div>
  );

  if (wsError) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-base-200 pt-16 lg:pl-72 z-1">
      <AlertTriangle size={64} className="text-error opacity-20 mb-4" />
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Connection Error</h2>
      <p className="opacity-60 mb-6">{wsError.message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary rounded-xl font-bold px-8 shadow-sm">
        Retry Connection
      </button>
    </div>
  );

  const cycleProgress = (3 - countdown) * (100 / 3);

  return (
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-16 lg:pl-72 transition-all">
      <main className="p-6 md:p-10 max-w-xxl mx-auto space-y-10">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-base-100 p-8 rounded-[2rem] border border-base-300 shadow-sm relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-10 -top-10 opacity-[0.03] text-primary rotate-12 pointer-events-none">
             <Activity size={300} />
          </div>

          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner font-black text-xl">
                 {wsData?.data.workspace_name.charAt(0)}
              </div>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 flex items-center gap-2">
                 <span className="inline-block h-px w-6 bg-primary"></span>
                 Dashboard Monitoring
              </p>
            </div>
            
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 w-full">
                <div>
                   <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-2">
                     {wsData?.data.workspace_name} <span className="text-primary">Overview</span>
                   </h1>
                   <p className="text-sm font-bold opacity-50 uppercase tracking-widest flex items-center gap-2 mt-3">
                     {wsData?.data.workspace_description || 'Active Network Topology & Monitoring'}
                   </p>
                </div>

                {/* Live Sync Indicator */}
                <div className="flex items-center gap-6 bg-base-200/50 p-4 rounded-2xl border border-base-300 backdrop-blur-sm self-start xl:self-auto">
                    <div className="flex flex-col gap-1 w-24">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block">Live Cycle</span>
                       <progress className="progress progress-primary w-full h-1.5" value={cycleProgress} max="100"></progress>
                    </div>
                    <div className="w-[1px] h-8 bg-base-300"></div>
                    <Link href={`/workspaces/${workspaceIdInt}/topology`} className="btn btn-primary btn-sm rounded-xl px-5 font-bold shadow-sm group">
                       Topology Map
                       <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
          </div>
        </div>

        {/* ── STATS DASHBOARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Nodes Tracked */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-primary/10 text-primary p-3 rounded-xl z-10 group-hover:scale-110 transition-transform">
                 <Server size={24} />
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Nodes Tracked</p>
              <div className="flex items-end gap-2">
                 <p className="text-4xl font-black leading-none text-base-content">{deviceStats.total}</p>
                 <span className="text-[10px] font-bold opacity-40 mb-1">Devices</span>
              </div>
            </div>
          </div>

          {/* Network Health */}
          <div className={`bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-base-content/20 transition-colors`}>
            <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity ${healthStatus.color}`}>
                <Activity size={120} />
            </div>
            <div className="flex justify-between items-start mb-4 z-10">
               <div className={`${healthStatus.bg} ${healthStatus.color} p-3 rounded-xl shadow-inner group-hover:scale-110 transition-transform`}>
                 {healthStatus.icon}
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Network Health</p>
              <p className={`text-2xl font-black uppercase tracking-tight ${healthStatus.color}`}>{healthStatus.label}</p>
            </div>
          </div>

          {/* Avg Latency */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-secondary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-secondary/10 text-secondary p-3 rounded-xl z-10 group-hover:scale-110 transition-transform">
                 <Zap size={24} />
               </div>
               <div className="badge badge-sm border-none bg-base-200 text-[9px] font-bold uppercase opacity-60">Avg</div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Response Time</p>
              <p className="text-4xl font-black text-secondary font-mono flex items-end gap-1 leading-none">
                 {deviceStats.avgLatency}<span className="text-sm font-bold opacity-50 mb-1">ms</span>
              </p>
            </div>
          </div>

          {/* Refresh Cycle */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-base-content/20 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-base-200 text-base-content/60 p-3 rounded-xl z-10 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                 <Clock size={24} />
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Next Sync In</p>
              <p className="text-4xl font-black uppercase tracking-tight font-mono text-base-content/80 flex items-end gap-1 leading-none">
                 {countdown}<span className="text-sm font-bold opacity-50 mb-1">sec</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── NODES LISTING ── */}
        <div className="space-y-6 pt-4">
          <div className="flex items-end justify-between border-b border-base-300 pb-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Network size={24} className="text-primary" />
                  Monitored Devices
              </h2>
              <span className="text-xs font-black opacity-30 tabular-nums uppercase tracking-widest">
                  {devices?.length || 0} Targets
              </span>
          </div>

          {!devices || devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-base-100 rounded-[3rem] border-2 border-dashed border-base-300 p-16 text-center opacity-70">
                <div className="bg-base-200 p-6 rounded-full mb-6">
                    <Server size={48} className="opacity-20 text-primary" />
                </div>
                <h3 className="font-black text-2xl tracking-tight uppercase mb-2">No Devices Configured</h3>
                <p className="text-sm font-bold max-w-sm mx-auto opacity-50 leading-relaxed">
                    Begin tracking your infrastructure by adding monitoring nodes from the Topology view.
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {devices.map((device) => {
                const deviceData = getDeviceData(device);
                const isOnline = deviceData.status === 'online';
                
                const latencyInt = parseInt(deviceData.latency);
                let latencyColorClass = 'text-success';
                let latencyBgClass = 'bg-success/10 border-success/20';
                
                if (isOnline && !isNaN(latencyInt)) {
                    if (latencyInt > 100) { latencyColorClass = 'text-warning'; latencyBgClass = 'bg-warning/10 border-warning/20'; }
                    if (latencyInt > 300) { latencyColorClass = 'text-error'; latencyBgClass = 'bg-error/10 border-error/20'; }
                }

                return (
                  <div
                    key={device.id}
                    className={`p-6 rounded-[2rem] border-none shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden bg-base-100 group ${
                        isOnline ? 'hover:shadow-primary/10' : 'opacity-80'
                    }`}
                  >
                    {/* Visual Pulse for Online */}
                    {isOnline && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-50"></div>
                    )}
                    
                    <div className="flex items-center gap-5 z-10 w-full sm:w-auto">
                      {/* Status Icon */}
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-colors ${
                           isOnline ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
                      }`}>
                          {isOnline ? <CheckCircle size={28} /> : <XCircle size={28} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-black tracking-tight text-xl truncate group-hover:text-primary transition-colors leading-none">
                            {device.name}
                          </h3>
                          <div className={`badge badge-sm uppercase tracking-widest text-[8px] font-black px-1.5 py-2 border-none ${isOnline? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold opacity-60 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5 bg-base-200 px-2 py-1 rounded-md text-base-content/80 overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px] sm:max-w-[200px]">
                              {device.target}
                          </span>
                          <span className="flex items-center gap-1"><Activity size={12}/> Met: {device.method}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-base-200 pt-4 sm:pt-0">
                        <div className="flex flex-col sm:items-end">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Response</span>
                            {isOnline ? (
                                <div className={`px-4 py-2 rounded-xl font-mono text-xl font-black leading-none border transition-colors ${latencyBgClass} ${latencyColorClass}`}>
                                    {deviceData.latency}
                                    <span className="text-[10px] ml-1 opacity-60">ms</span>
                                </div>
                            ) : (
                                <div className="px-4 py-2 rounded-xl bg-error/10 text-error border border-error/20 font-mono text-xl font-black leading-none">
                                    N/A
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}