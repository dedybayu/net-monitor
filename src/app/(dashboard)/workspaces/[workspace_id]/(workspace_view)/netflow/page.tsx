'use client';

import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/src/hooks/useWebSocket';
import { useTrafficData } from '@/src/hooks/useTrafficData';
import DashboardHeader from '@/src/components/netflow/DashboardHeader';
import StatsCards from '@/src/components/netflow/StatsCards';
import TrafficChart from '@/src/components/netflow/TrafficChart';
import AppBreakdown from '@/src/components/netflow/AppBreakdown';
import LiveFlowTable from '@/src/components/netflow/LiveFlowTable';
import UserTable from '@/src/components/netflow/UserTable';
import DetailedFlowTable from '@/src/components/netflow/DetailedFlowTable';

export default function DashboardPage() {
  // Determine WebSocket URL based on current window location
  const wsUrl =
    typeof window !== 'undefined'
      ? `ws://${window.location.host}/ws`
      : 'ws://localhost:3000/ws';

  const { lastMessage, isConnected, reconnectAttempts, sendMessage } = useWebSocket({
    url: wsUrl,
  });

  const [currentPorts, setCurrentPorts] = useState<number[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const [useBits, setUseBits] = useState(false);

  const {
    data,
    processMessage,
    availableRouters,
    availablePorts,
    selectedRouter,
    setSelectedRouter,
    selectedPort,
    setSelectedPort
  } = useTrafficData();

  // Track processed messages to prevent duplicate processing on re-renders
  const lastProcessedRef = useRef<unknown>(null);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage !== lastProcessedRef.current) {
      if (lastMessage.type === 'collector_status') {
        setCurrentPorts(lastMessage.ports);
        setIsDemo(lastMessage.demo);
      }
      processMessage(lastMessage);
      lastProcessedRef.current = lastMessage;
    }
  }, [lastMessage, processMessage]);

  const handleSavePorts = (ports: number[]) => {
    sendMessage({ type: 'change_ports', ports });
  };

  return (
    <div className="min-h-screen z-1 bg-base-200 font-sans lg:pl-72 pt-16">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
      <DashboardHeader
        isConnected={isConnected}
        reconnectAttempts={reconnectAttempts}
        currentPorts={currentPorts}
        isDemo={isDemo}
        onSavePorts={handleSavePorts}
      />

      {/* Router Selector Row */}
      {availableRouters.length > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold opacity-50 uppercase tracking-wider">Monitor:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedRouter('all')}
                className={`btn btn-sm ${selectedRouter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                All Routers
              </button>
              {availableRouters.map(ip => (
                <button
                  key={ip}
                  onClick={() => {
                    setSelectedRouter(ip);
                    setSelectedPort('all');
                  }}
                  className={`btn btn-sm ${selectedRouter === ip ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Router: {ip}
                </button>
              ))}
            </div>

            {/* Port Selector */}
            <div className="flex gap-1 ml-4 border-l border-base-content/10 pl-4">
              <span className="text-sm font-semibold opacity-50 uppercase tracking-wider mr-2">Port:</span>
              <button
                onClick={() => {
                  setSelectedPort('all');
                }}
                className={`btn btn-sm ${selectedPort === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                All
              </button>
              {availablePorts.map(port => (
                <button
                  key={port}
                  onClick={() => {
                    setSelectedPort(port);
                    setSelectedRouter('all');
                  }}
                  className={`btn btn-sm ${selectedPort === port ? 'btn-primary' : 'btn-ghost'}`}
                >
                  UDP: {port}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <span className="text-sm font-semibold opacity-50 uppercase tracking-wider mr-2">Unit:</span>
              <button
                onClick={() => setUseBits(false)}
                className={`btn btn-sm ${!useBits ? 'btn-secondary' : 'btn-ghost'}`}
              >
                Bytes (B)
              </button>
              <button
                onClick={() => setUseBits(true)}
                className={`btn btn-sm ${useBits ? 'btn-secondary' : 'btn-ghost'}`}
              >
                Bits (b)
              </button>
            </div>
          </div>
          <div className="text-[10px] opacity-40 font-mono flex flex-col items-end">
            <span>{availableRouters.length} Mikrotik(s) detected</span>
            <span>{availablePorts.length} Port(s) active</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mt-6">
        <StatsCards
          totalBytesPerSecond={data.stats.totalBytesPerSecond}
          activeUsers={data.stats.activeUsers}
          topApplication={data.stats.topApplication}
          totalFlows={data.stats.totalFlows}
          useBits={useBits}
        />
      </div>

      {/* Charts Row */}
      <div className="mt-6">
        <div className="lg:col-span-2">
          <TrafficChart
            data={data.bandwidthTimeSeries}
            appSummary={data.appSummary}
            useBits={useBits}
          />
        </div>
        <div className="lg:col-span-1">
          <AppBreakdown data={data.appSummary} useBits={useBits} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveFlowTable flows={data.recentFlows} useBits={useBits} />
        <UserTable users={data.userSummary} useBits={useBits} />
      </div>

      {/* Full Detailed Table Row */}
      <div className="mt-6">
        <DetailedFlowTable flows={data.recentFlows} useBits={useBits} />
      </div>

      {/* Footer */}
      <footer className="mt-8 mb-4 text-center text-xs text-base-content/30">
        Traffic Monitor v0.1.0 — MikroTik NetFlow v9 Collector
      </footer>
      </div>
    </div>
  );
}
