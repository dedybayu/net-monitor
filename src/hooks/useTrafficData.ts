'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ClassifiedFlow,
  AppTrafficSummary,
  UserTrafficSummary,
  BandwidthDataPoint,
  DashboardData,
  WSMessage,
} from '@/types/traffic';
import { APP_COLORS } from '@/types/traffic';

const MAX_FLOWS = 100;          // Max flows kept in memory
const MAX_CHART_POINTS = 30;    // Max time-series data points
const CHART_INTERVAL_MS = 2000; // Chart update interval

export interface TrafficDataState extends TrafficDataStateBase {
  availableRouters: string[];
  availablePorts: number[];
}

interface TrafficDataStateBase {
  recentFlows: ClassifiedFlow[];
  appSummary: AppTrafficSummary[];
  userSummary: UserTrafficSummary[];
  bandwidthTimeSeries: BandwidthDataPoint[];
  stats: {
    totalBytesPerSecond: number;
    activeUsers: number;
    topApplication: string;
    totalFlows: number;
  };
}

const INITIAL_BASE_STATE: TrafficDataStateBase = {
  recentFlows: [],
  appSummary: [],
  userSummary: [],
  bandwidthTimeSeries: [],
  stats: {
    totalBytesPerSecond: 0,
    activeUsers: 0,
    topApplication: 'N/A',
    totalFlows: 0,
  },
};

/**
 * Hook that aggregates raw WebSocket flow data into dashboard-ready data.
 * Supports multiple routers by segregating data by routerIp.
 */
export function useTrafficData() {
  const [selectedRouter, setSelectedRouter] = useState<string | 'all'>('all');
  const [selectedPort, setSelectedPort] = useState<number | 'all'>('all');
  const [availableRouters, setAvailableRouters] = useState<string[]>([]);
  const [availablePorts, setAvailablePorts] = useState<number[]>([]);
  const [data, setData] = useState<TrafficDataStateBase>(INITIAL_BASE_STATE);

  // Aggregates stored per target (e.g., 'router:192.168.1.1', 'port:2055', or 'all')
  const targetDataRef = useRef<Record<string, {
    flowBuffer: ClassifiedFlow[];
    allFlows: ClassifiedFlow[];
    appTotals: Record<string, { bytes: number; packets: number; count: number }>;
    userTotals: Record<string, UserTrafficSummary>;
    timeSeries: BandwidthDataPoint[];
    knownApps: Set<string>;
    stats: TrafficDataStateBase['stats'];
    routers?: Set<string>; // Only for port targets
  }>>({
    all: {
      flowBuffer: [],
      allFlows: [],
      appTotals: {},
      userTotals: {},
      timeSeries: [],
      knownApps: new Set(),
      stats: { ...INITIAL_BASE_STATE.stats }
    }
  });

  // Unique ID for the current selection
  const currentKey = selectedPort !== 'all' ? `port:${selectedPort}` : (selectedRouter !== 'all' ? `router:${selectedRouter}` : 'all');

  // Ensure target entry exists
  const getTargetRef = (key: string) => {
    if (!targetDataRef.current[key]) {
      targetDataRef.current[key] = {
        flowBuffer: [],
        allFlows: [],
        appTotals: {},
        userTotals: {},
        timeSeries: [],
        knownApps: new Set(),
        stats: { ...INITIAL_BASE_STATE.stats }
      };
      
      // Update available ports list
      const keys = Object.keys(targetDataRef.current);
      setAvailablePorts(keys.filter(k => k.startsWith('port:')).map(k => parseInt(k.replace('port:', ''), 10)));
    }
    return targetDataRef.current[key];
  };

  // Chart interval: periodically compute bandwidth time-series for ALL targets
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });

      for (const key of Object.keys(targetDataRef.current)) {
        const rRef = targetDataRef.current[key];
        const buffered = rRef.flowBuffer.splice(0);
        const totalBytes = buffered.reduce((sum, f) => sum + f.bytes, 0);

        const appBreakdown: Record<string, number> = {};
        for (const f of buffered) {
          appBreakdown[f.application] = (appBreakdown[f.application] || 0) + f.bytes;
          rRef.knownApps.add(f.application);
        }

        const filledBreakdown: Record<string, number> = {};
        for (const app of rRef.knownApps) {
          filledBreakdown[app] = appBreakdown[app] || 0;
        }

        const point: BandwidthDataPoint = {
          timestamp: now,
          label: timeStr,
          totalBytes,
          ...filledBreakdown,
        };

        rRef.timeSeries = [
          ...rRef.timeSeries.slice(-(MAX_CHART_POINTS - 1)),
          point,
        ];
      }

      // Update current view if it was the time series
      const activeRef = targetDataRef.current[currentKey];
      if (activeRef) {
        setData((prev) => ({
          ...prev,
          bandwidthTimeSeries: [...activeRef.timeSeries],
        }));
      }
    }, CHART_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [currentKey, selectedPort]);

  // Sync data and available routers when currentKey or selectedPort changes
  useEffect(() => {
    const activeRef = targetDataRef.current[currentKey];
    
    // Update available routers based on selected port
    const keys = Object.keys(targetDataRef.current);
    const allRouters = keys.filter(k => k.startsWith('router:')).map(k => k.replace('router:', ''));
    if (selectedPort !== 'all') {
      const portRef = targetDataRef.current[`port:${selectedPort}`];
      if (portRef && portRef.routers) {
        const currentAvailable = Array.from(portRef.routers);
        setAvailableRouters(currentAvailable);
        
        // Reset selected router if it's no longer available for this port
        if (selectedRouter !== 'all' && !currentAvailable.includes(selectedRouter)) {
          setSelectedRouter('all');
        }
      } else {
        setAvailableRouters([]);
      }
    } else {
      setAvailableRouters(allRouters);
    }

    if (activeRef) {
      // Re-calculate summaries for the view
      const appSummary = Object.entries(activeRef.appTotals)
        .map(([application, d]) => ({
          application,
          totalBytes: d.bytes,
          totalPackets: d.packets,
          flowCount: d.count,
          color: APP_COLORS[application] || APP_COLORS['Other'],
        }))
        .sort((a, b) => b.totalBytes - a.totalBytes);

      const userSummary = Object.values(activeRef.userTotals)
        .sort((a, b) => b.totalBytes - a.totalBytes);

      setData({
        recentFlows: [...activeRef.allFlows],
        appSummary,
        userSummary,
        bandwidthTimeSeries: [...activeRef.timeSeries],
        stats: activeRef.stats,
      });
    }
  }, [currentKey]);

  /**
   * Process a WebSocket message and update segregated data.
   */
  const processMessage = useCallback((message: WSMessage) => {
    if (message.type !== 'traffic_update') return;

    const update = message as DashboardData;
    const flows = update.flows;

    // Determine all targets for this batch
    const routersInBatch = new Set(flows.map(f => f.routerIp));
    const portsInBatch = new Set(flows.map(f => f.collectorPort));
    
    const targets: string[] = ['all'];
    routersInBatch.forEach(r => targets.push(`router:${r}`));
    portsInBatch.forEach(p => targets.push(`port:${p}`));

    for (const targetKey of targets) {
      const rRef = getTargetRef(targetKey);
      
      let targetFlows: ClassifiedFlow[];
      if (targetKey === 'all') {
        targetFlows = flows;
      } else if (targetKey.startsWith('router:')) {
        const ip = targetKey.replace('router:', '');
        targetFlows = flows.filter(f => f.routerIp === ip);
      } else {
        const port = parseInt(targetKey.replace('port:', ''), 10);
        targetFlows = flows.filter(f => f.collectorPort === port);
      }
      
      if (targetFlows.length === 0) continue;

      rRef.flowBuffer.push(...targetFlows);
      
      // Update recent flows
      const existingIds = new Set(rRef.allFlows.map(f => f.id));
      const uniqueNewFlows = targetFlows.filter(f => !existingIds.has(f.id));
      
      if (uniqueNewFlows.length > 0) {
        rRef.allFlows = [...uniqueNewFlows, ...rRef.allFlows].slice(0, MAX_FLOWS);
      }

      for (const f of targetFlows) {
        // App totals
        const aT = rRef.appTotals[f.application] || { bytes: 0, packets: 0, count: 0 };
        aT.bytes += f.bytes;
        aT.packets += f.packets;
        aT.count += 1;
        rRef.appTotals[f.application] = aT;

        // Track routers per port
        if (targetKey.startsWith('port:')) {
          if (!rRef.routers) rRef.routers = new Set();
          rRef.routers.add(f.routerIp);
        }

        // User totals
        const uT = rRef.userTotals[f.srcIp] || {
          srcIp: f.srcIp, totalBytes: 0, totalPackets: 0, flowCount: 0, topApplication: '', applications: {},
        };
        uT.totalBytes += f.bytes;
        uT.totalPackets += f.packets;
        uT.flowCount += 1;
        uT.applications[f.application] = (uT.applications[f.application] || 0) + f.bytes;

        let maxApp = '', maxB = 0;
        for (const [app, b] of Object.entries(uT.applications)) {
          if (b > maxB) { maxApp = app; maxB = b; }
        }
        uT.topApplication = maxApp;
        rRef.userTotals[f.srcIp] = uT;
      }

      // Update stats
      if (targetKey === 'all') {
        rRef.stats = update.stats;
      } else {
        rRef.stats = {
          ...rRef.stats,
          totalFlows: rRef.stats.totalFlows + targetFlows.length,
          activeUsers: Object.keys(rRef.userTotals).length,
        };
      }
    }

    // Refresh view if current key was updated
    if (targets.includes(currentKey)) {
      const activeRef = targetDataRef.current[currentKey];
      
      // Update available routers list if it changed
      const keys = Object.keys(targetDataRef.current);
      const allRouters = keys.filter(k => k.startsWith('router:')).map(k => k.replace('router:', ''));
      if (selectedPort !== 'all') {
        const portRef = targetDataRef.current[`port:${selectedPort}`];
        if (portRef && portRef.routers) {
          setAvailableRouters(Array.from(portRef.routers));
        }
      } else {
        setAvailableRouters(allRouters);
      }

      const appSummary = Object.entries(activeRef.appTotals)
        .map(([application, d]) => ({
          application,
          totalBytes: d.bytes,
          totalPackets: d.packets,
          flowCount: d.count,
          color: APP_COLORS[application] || APP_COLORS['Other'],
        }))
        .sort((a, b) => b.totalBytes - a.totalBytes);

      setData((prev) => ({
        ...prev,
        recentFlows: [...activeRef.allFlows],
        appSummary,
        userSummary: Object.values(activeRef.userTotals).sort((a, b) => b.totalBytes - a.totalBytes),
        stats: activeRef.stats,
      }));
    }
  }, [currentKey]);

  return { 
    data, 
    processMessage, 
    availableRouters, 
    availablePorts,
    selectedRouter, 
    setSelectedRouter,
    selectedPort,
    setSelectedPort
  };
}
