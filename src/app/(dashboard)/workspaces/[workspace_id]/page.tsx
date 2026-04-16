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
    if (deviceStats.total === 0) return { label: 'No Data', color: 'text-base-content/50', bg: 'bg-base-100' };
    if (deviceStats.online === deviceStats.total) return { label: 'Healthy', color: 'text-success', bg: 'bg-success/10' };
    if (deviceStats.online === 0) return { label: 'Down', color: 'text-error', bg: 'bg-error/10' };
    return { label: 'Issues Found', color: 'text-warning', bg: 'bg-warning/10' };
  }, [deviceStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 3 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (wsLoading) return (
    // pt-16 = tinggi navbar, lg:pl-72 = lebar sidebar
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-300 gap-4 pt-16 lg:pl-72">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="text-sm font-bold tracking-widest animate-pulse uppercase">Verifying Access...</p>
    </div>
  );

  if (wsError) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-base-200 pt-16 lg:pl-72">
      <div className="alert alert-error shadow-lg max-w-lg">
        <span>Error: {wsError.message}</span>
        <button onClick={() => window.location.reload()} className="btn btn-sm btn-ghost border border-white/20">Retry</button>
      </div>
    </div>
  );

  return (
    /*
      pt-16  → geser konten ke bawah setinggi top navbar (h-16)
      lg:pl-64 → geser konten ke kanan selebar sidebar (w-64) di desktop
    */
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-6 lg:pl-72">

      {/* SUB-NAVBAR halaman ini (sticky, ikut offset sidebar) */}
      <div className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-16 z-40 shadow-sm">
        <div className="flex-1 gap-4">
          <div>
            <h1 className="font-bold text-sm leading-none">{wsData?.data.workspace_name}</h1>
            <span className="text-[10px] opacity-50 uppercase tracking-widest font-bold">
              {wsData?.data.workspace_description}
            </span>
          </div>
        </div>
        <div className="flex-none gap-4">
          <div className="hidden md:flex flex-col items-end text-right mr-2">
            <span className="text-[10px] opacity-50 font-bold uppercase tracking-widest leading-none mb-1">Cycle</span>
            <progress
              className="progress progress-primary w-24 h-1.5"
              value={(3 - countdown) * (100 / 3)}
              max="100"
            />
          </div>
          <Link
            href={`/workspaces/${workspaceIdInt}/topology`}
            className="btn btn-primary btn-sm rounded-lg px-6 font-bold"
          >
            Topologi
          </Link>
        </div>
      </div>

      <main className="p-6 md:p-10 max-w-xxl mx-auto">
        {/* STATS SUMMARY */}
        <div className="stats shadow bg-base-100 w-full mb-10 border border-base-300 overflow-hidden">
          <div className="stat">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Nodes Tracked</div>
            <div className="stat-value text-primary">{deviceStats.total}</div>
            <div className="stat-desc font-medium">Database Source</div>
          </div>

          <div className={`stat border-l border-base-300 transition-all duration-500 ${healthStatus.bg}`}>
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Network Health</div>
            <div className={`stat-value ${healthStatus.color}`}>{healthStatus.label}</div>
            <div className="stat-desc font-bold">{deviceStats.online} / {deviceStats.total} Online</div>
          </div>

          <div className="stat border-l border-base-300 bg-base-200/50">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Avg. Latency</div>
            <div className="stat-value text-secondary font-mono">
              {deviceStats.avgLatency}<span className="text-sm ml-1">ms</span>
            </div>
            <div className="stat-desc font-medium">From {deviceStats.online} online nodes</div>
          </div>

          <div className="stat border-l border-base-300">
            <div className="stat-title font-bold text-[10px] uppercase tracking-widest opacity-60">Next Update</div>
            <div className="stat-value text-primary/40">{countdown}s</div>
            <div className="stat-desc font-mono">Auto-sync active</div>
          </div>
        </div>

        {/* GRID CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices?.map((device) => {
            const deviceData = getDeviceData(device);
            const isOnline = deviceData.status === 'online';

            return (
              <div
                key={device.id}
                className={`card bg-base-100 shadow-xl border ${isOnline ? 'border-base-300' : 'border-error/50 animate-pulse'} hover:border-primary transition-all group`}
              >
                <div className="card-body p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[70%]">
                      <h2 className="card-title text-2xl font-black tracking-tight mb-1 truncate">{device.name}</h2>
                      <div className="badge badge-ghost font-mono text-[9px] opacity-60">{device.target}</div>
                    </div>
                    <div className={`badge ${isOnline ? 'badge-success' : 'badge-error'} gap-2 font-black py-3 px-4 shadow-sm`}>
                      <span className={`h-2 w-2 rounded-full bg-current ${isOnline ? 'animate-pulse' : ''}`}></span>
                      {deviceData.status.toUpperCase()}
                    </div>
                  </div>

                  <div className={`rounded-2xl p-5 flex items-center justify-between border border-base-300 shadow-inner transition-colors ${isOnline ? 'bg-base-200 group-hover:bg-primary/5' : 'bg-error/5'}`}>
                    <div>
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Latency</span>
                      <span className={`text-3xl font-black font-mono leading-none ${isOnline ? 'text-primary' : 'text-error'}`}>
                        {deviceData.latency}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest block mb-1">Method</span>
                      <span className="badge badge-outline badge-xs font-bold uppercase">{device.method}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}