'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  time: string;
  cpu: number;
  memory: number;
  rx: number;
  tx: number;
}

export default function SNMPDashboard() {
  // State untuk pengaturan polling
  const [isPolling, setIsPolling] = useState(true);
  const [intervalMs, setIntervalMs] = useState(3000); // Default 3 detik
  const [data, setData] = useState<DataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Menghubungkan...');
  const [routerName, setRouterName] = useState('Router');

  // Menyimpan data traffic sebelumnya untuk mengkalkulasi Mbps
  const prevDataRef = useRef({ rxBytes: 0, txBytes: 0, timestamp: 0 });

  // Effect untuk interval polling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSNMPData = async () => {
      try {
        const response = await fetch('/api/snmp');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        if (rawData.sysName) {
          setRouterName(rawData.sysName);
        }
        setConnectionStatus('Terhubung');

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        
        let rxMbps = 0;
        let txMbps = 0;
        const prev = prevDataRef.current;

        // Hitung selisih bytes (Rx/Tx) ke Mbps
        if (prev.timestamp > 0 && rawData.timestamp > prev.timestamp) {
          const timeDiffInSeconds = (rawData.timestamp - prev.timestamp) / 1000;
          
          if (rawData.rxBytes >= prev.rxBytes) {
            const rxDiffBytes = rawData.rxBytes - prev.rxBytes;
            // rumus: (bytes * 8) / (1000000 * detik) = Mbps
            rxMbps = (rxDiffBytes * 8) / (1_000_000 * timeDiffInSeconds);
          }
          
          if (rawData.txBytes >= prev.txBytes) {
            const txDiffBytes = rawData.txBytes - prev.txBytes;
            txMbps = (txDiffBytes * 8) / (1_000_000 * timeDiffInSeconds);
          }
        }

        // Update nilai reference untuk perhitungan siklus berikutnya
        prevDataRef.current = {
          rxBytes: rawData.rxBytes,
          txBytes: rawData.txBytes,
          timestamp: rawData.timestamp,
        };

        const newDataPoint: DataPoint = {
          time: timeStr,
          cpu: rawData.cpu || 0,
          memory: rawData.memory || 0,
          rx: rxMbps > 0 ? parseFloat(rxMbps.toFixed(2)) : 0,
          tx: txMbps > 0 ? parseFloat(txMbps.toFixed(2)) : 0,
        };

        setData((prevData) => {
          const updatedData = [...prevData, newDataPoint];
          // Simpan maksimal 20 titik data terakhir agar grafik tidak menumpuk
          if (updatedData.length > 20) {
            return updatedData.slice(updatedData.length - 20);
          }
          return updatedData;
        });

      } catch (error) {
        console.error('Error fetching SNMP data:', error);
        setConnectionStatus('Terputus');
      }
    };

    if (isPolling) {
      fetchSNMPData(); // Panggil sekali langsung
      interval = setInterval(fetchSNMPData, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, intervalMs]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring {routerName} (SNMP)</h1>
          <div className="flex items-center mt-2">
            <span className={`flex w-3 h-3 rounded-full mr-2 ${connectionStatus === 'Terhubung' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600 font-medium">Status SNMP: {connectionStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <label htmlFor="interval">Interval Polling:</label>
            <select
              id="interval"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              disabled={!isPolling}
              className="border border-gray-300 rounded p-1.5 bg-white disabled:bg-gray-100 outline-none"
            >
              <option value={1000}>1 Detik</option>
              <option value={3000}>3 Detik</option>
              <option value={5000}>5 Detik</option>
              <option value={10000}>10 Detik</option>
            </select>
          </div>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-4 py-2 rounded font-medium text-white transition-colors ${
              isPolling ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isPolling ? 'Jeda Polling' : 'Mulai Polling'}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: CPU & Memory */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Penggunaan CPU & Memori (%)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#a0aec0" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#a0aec0" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="memory" name="Memori (%)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Network Traffic */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Trafik Jaringan (Mbps)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#a0aec0" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a0aec0" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="rx" name="Download (Rx)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="tx" name="Upload (Tx)" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}