"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface NoVncConsoleProps {
  proxmoxId: string;
  node: string;
  vmid: string;
}

export default function NoVncConsole({ proxmoxId, node, vmid }: NoVncConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const generationRef = useRef(0); // Track mount generation to prevent StrictMode duplicates
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  const connectVNC = useCallback(async (generation: number) => {
    if (!containerRef.current) return;

    setStatus('connecting');
    setErrorMessage('');

    try {
      // 1. Fetch VNC ticket dari API Next.js
      const tokenRes = await fetch(`/api/proxmox/${proxmoxId}/nodes/${node}/vm/${vmid}/vnctoken`, {
        method: 'POST',
      });

      // Abort if this connection attempt is stale (StrictMode remount happened)
      if (generation !== generationRef.current) return;

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to get VNC token (${tokenRes.status})`);
      }

      const { ticket, port } = await tokenRes.json();

      if (!ticket || !port) {
        throw new Error('Tiket atau port VNC tidak tersedia dari server Proxmox.');
      }

      // 2. Buat URL WebSocket Proxy dengan ticket dan port
      const vncBaseUrl = process.env.NEXT_PUBLIC_VNC_WS_URL 
        || `ws://${window.location.hostname}:3091`;
      const wsUrl = `${vncBaseUrl}/?proxmox_id=${proxmoxId}&node=${node}&vmid=${vmid}&port=${port}&vncticket=${encodeURIComponent(ticket)}`;

      // 3. Import RFB dynamically from novnc-next
      // @ts-ignore
      const { default: RFB } = await import('novnc-next');

      // Abort if stale
      if (generation !== generationRef.current) return;

      // 4. Clear container before creating new RFB
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // 5. Buat koneksi RFB dengan ticket sebagai password
      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: { password: ticket }
      });
      rfbRef.current = rfb;

      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfb.background = '#000000';

      rfb.addEventListener('connect', () => {
        if (generation === generationRef.current) {
          setStatus('connected');
        }
      });

      rfb.addEventListener('disconnect', (e: any) => {
        if (generation !== generationRef.current) return;
        if (e.detail?.clean === false) {
          setErrorMessage('Koneksi terputus tiba-tiba. Pastikan VNC Proxy berjalan (npm run vnc-proxy).');
          setStatus('error');
        } else {
          setStatus('disconnected');
        }
      });

      rfb.addEventListener('securityfailure', (e: any) => {
        if (generation !== generationRef.current) return;
        setStatus('error');
        setErrorMessage(e.detail?.reason || 'Security/Authentication failure');
      });

    } catch (err: any) {
      if (generation !== generationRef.current) return;
      console.error("VNC Connect Error:", err);
      setStatus('error');
      setErrorMessage(err.message || 'Gagal menginisialisasi koneksi VNC');
    }
  }, [proxmoxId, node, vmid]);

  useEffect(() => {
    // Increment generation — any in-flight connection from previous mount becomes stale
    const gen = ++generationRef.current;

    // Cleanup previous RFB
    if (rfbRef.current) {
      try { rfbRef.current.disconnect(); } catch (e) {}
      rfbRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    connectVNC(gen);

    return () => {
      // Invalidate this generation so its async work is discarded
      generationRef.current++;
      if (rfbRef.current) {
        try { rfbRef.current.disconnect(); } catch (e) {}
        rfbRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [connectVNC]);

  const handleReconnect = useCallback(() => {
    if (rfbRef.current) {
      try { rfbRef.current.disconnect(); } catch (e) {}
      rfbRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    const gen = ++generationRef.current;
    connectVNC(gen);
  }, [connectVNC]);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden group rounded-b-[1.2rem]">
      {status === 'connecting' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="font-bold tracking-wider animate-pulse">Menghubungkan ke Console VM...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-error p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-4">
             <span className="text-3xl">⚠</span>
          </div>
          <h3 className="text-xl font-black mb-2">Koneksi Gagal</h3>
          <p className="opacity-80 text-sm max-w-md">{errorMessage}</p>
          <button 
             className="btn btn-outline btn-error btn-sm mt-6"
             onClick={handleReconnect}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {status === 'disconnected' && !errorMessage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white">
          <p className="font-bold opacity-50">Sesi Terputus</p>
          <button 
             className="btn btn-ghost btn-sm mt-4"
             onClick={handleReconnect}
          >
            Sambungkan Ulang
          </button>
        </div>
      )}

      {/* The container for the VNC canvas */}
      <div 
         ref={containerRef} 
         className="w-full h-full flex items-center justify-center outline-none [&_canvas]:max-w-full [&_canvas]:max-h-full"
      ></div>
      
      {/* Overlay controls */}
      {status === 'connected' && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
          <button 
             className="btn btn-sm btn-neutral glass font-bold text-[10px]"
             onClick={() => {
                if (rfbRef.current) {
                  rfbRef.current.sendCtrlAltDel();
                }
             }}
          >
             Ctrl+Alt+Del
          </button>
        </div>
      )}
    </div>
  );
}
