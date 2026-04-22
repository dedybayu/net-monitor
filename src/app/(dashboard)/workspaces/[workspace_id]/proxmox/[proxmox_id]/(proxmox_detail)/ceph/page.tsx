'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { ArrowLeft, Database, Activity, CheckCircle, AlertTriangle, XCircle, HardDrive, Server, ShieldCheck, PieChart, ShieldAlert } from 'lucide-react';

// Format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function CephDetailPage({ params }: { params: Promise<{ proxmox_id: string, workspace_id: string }> }) {
  const { proxmox_id: proxmoxId, workspace_id: workspaceId } = use(params);

  const [cephData, setCephData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proxmoxId) return;

    fetch(`/api/proxmox/${proxmoxId}/ceph`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch ceph status');
        return res.json();
      })
      .then((json) => {
        if (json.data) setCephData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [proxmoxId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 lg:pl-72 z-1 relative">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="mt-4 text-[10px] font-black tracking-[0.35em] uppercase opacity-40 animate-pulse">Syncing Ceph Data...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 lg:pl-72 z-1 text-center p-6 text-error">
      <ShieldAlert size={64} className="opacity-20 mb-4" />
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Connection Error</h2>
      <p className="opacity-60">{error}</p>
    </div>
  );

  if (!cephData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 lg:pl-72 z-1 text-center p-6 text-warning">
      <AlertTriangle size={64} className="opacity-20 mb-4" />
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Ceph Not Configured</h2>
      <p className="opacity-60">Ceph is not installed or configured on this cluster.</p>
    </div>
  );

  const healthStatus = cephData?.health?.status;
  const isHealthy = healthStatus === 'HEALTH_OK';
  const isWarn = healthStatus === 'HEALTH_WARN';
  const healthColor = isHealthy ? 'text-success bg-success/10' : isWarn ? 'text-warning bg-warning/10' : 'text-error bg-error/10';
  const healthIcon = isHealthy ? <CheckCircle size={32} /> : isWarn ? <AlertTriangle size={32} /> : <XCircle size={32} />;

  const pgmap = cephData?.pgmap || {};
  const osdmap = cephData?.osdmap || {};
  const monmap = cephData?.monmap || {};
  const mgrmap = cephData?.mgrmap || {};

  const usagePercent = pgmap.bytes_total ? (pgmap.bytes_used / pgmap.bytes_total) * 100 : 0;

  return (
    <div className="min-h-screen bg-base-200 z-1 font-sans lg:pl-72 pt-6 transition-all pb-12">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        {/* ── HEADER ── */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <Link href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                        <ArrowLeft size={16} />
                    </Link>
                    <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                        <span className="inline-block h-px w-6 bg-primary"></span>
                        Storage
                    </p>
                </div>
                <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-3">
                    Ceph <span className="text-primary">Status</span>
                </h1>
                <div className="flex items-center gap-4 text-xs font-bold opacity-60 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-base-300 px-3 py-1.5 rounded-lg border border-base-content/10">
                        <Database size={14} />
                        FSID: {cephData.fsid}
                    </span>
                </div>
            </div>
            
            <div className={`badge badge-lg gap-2 py-4 px-5 rounded-2xl font-black tracking-widest text-[10px] uppercase shadow-sm border-none ${healthColor}`}>
               {isHealthy ? <ShieldCheck size={16} /> : isWarn ? <AlertTriangle size={16} /> : <ShieldAlert size={16} />}
               {healthStatus}
            </div>
        </div>

        {/* ── HEALTH CHECKS / WARNING CAUSES ── */}
        {(!isHealthy && cephData?.health?.checks && Object.keys(cephData.health.checks).length > 0) && (
            <div className={`mb-10 p-6 md:p-8 rounded-[2rem] border relative overflow-hidden ${isWarn ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20'}`}>
                <div className={`absolute -right-4 -top-4 opacity-5 pointer-events-none ${isWarn ? 'text-warning' : 'text-error'}`}>
                    <AlertTriangle size={150} />
                </div>
                <h3 className={`text-xl font-black tracking-tight flex items-center gap-3 mb-6 relative z-10 ${isWarn ? 'text-warning' : 'text-error'}`}>
                    {isWarn ? <AlertTriangle size={24} /> : <ShieldAlert size={24} />}
                    Health Issues
                </h3>
                <div className="flex flex-col gap-3 relative z-10">
                    {Object.entries(cephData.health.checks).map(([code, check]: [string, any]) => (
                        <div key={code} className={`flex items-start gap-4 p-4 rounded-xl border ${isWarn ? 'bg-warning/5 border-warning/20' : 'bg-error/5 border-error/20'}`}>
                            <div className={`mt-0.5 ${check.severity === 'HEALTH_ERR' ? 'text-error' : 'text-warning'}`}>
                                {check.severity === 'HEALTH_ERR' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                            </div>
                            <div>
                                <h4 className="font-black uppercase tracking-widest text-[10px] opacity-70 mb-1">{code}</h4>
                                <p className="text-sm font-bold opacity-90">{check?.summary?.message || 'Details not available'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ── STATS DASHBOARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          
          {/* Health Status */}
          <div className={`bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group transition-colors ${
              isHealthy ? 'hover:border-success/30' : isWarn ? 'hover:border-warning/30' : 'hover:border-error/30'
          }`}>
            <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${isHealthy ? 'text-success' : isWarn ? 'text-warning' : 'text-error'}`}>
                <Activity size={120} />
            </div>
            <div className={`p-4 rounded-2xl z-10 ${healthColor}`}>
              {healthIcon}
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Health Status</p>
              <p className={`text-2xl lg:text-3xl font-black leading-none ${isHealthy ? 'text-success' : isWarn ? 'text-warning' : 'text-error'}`}>
                  {isHealthy ? 'OK' : isWarn ? 'WARN' : 'ERROR'}
              </p>
            </div>
          </div>

          {/* OSD Status */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <HardDrive size={120} />
            </div>
            <div className="bg-primary/10 text-primary p-4 rounded-2xl z-10">
              <HardDrive size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">OSDs (UP/IN)</p>
              <p className="text-3xl font-black text-primary">
                  {osdmap.num_up_osds} / {osdmap.num_in_osds}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Total: {osdmap.num_osds}</p>
            </div>
          </div>

          {/* Monitors */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-info/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server size={120} />
            </div>
            <div className="bg-info/10 text-info p-4 rounded-2xl z-10">
              <Server size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Monitors</p>
              <p className="text-3xl font-black text-info">
                  {cephData?.quorum_names?.length || 0}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">In Quorum</p>
            </div>
          </div>

          {/* PGs */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-secondary/30 transition-colors">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <PieChart size={120} />
            </div>
            <div className="bg-secondary/10 text-secondary p-4 rounded-2xl z-10">
              <PieChart size={32} />
            </div>
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Placement Grps</p>
              <p className="text-3xl font-black text-secondary">
                  {pgmap?.num_pgs || 0}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Total PGs</p>
            </div>
          </div>

        </div>

        {/* ── STORAGE USAGE SECTION ── */}
        <div className="bg-base-100 rounded-[2rem] border border-base-300 p-8 md:p-10 mb-10 overflow-hidden relative group w-full">
           <div className="absolute right-0 top-0 opacity-5 w-64 h-64 -translate-y-1/2 translate-x-1/3 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Database size={256} className="text-primary"/>
           </div>
           
           <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 mb-8 relative z-10">
              <Database size={28} className="text-primary" />
              Storage Capacity
           </h2>

           <div className="relative z-10 w-full">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-50 mb-1">Used Space</p>
                    <p className="text-4xl md:text-5xl font-black tracking-tighter text-base-content leading-none">{formatBytes(pgmap.bytes_used)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-50 mb-1">Total Capacity</p>
                    <p className="text-2xl md:text-3xl font-black opacity-80 tracking-tighter leading-none">{formatBytes(pgmap.bytes_total)}</p>
                 </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="h-6 md:h-8 bg-base-300 rounded-full overflow-hidden flex w-full relative">
                  <div 
                      className={`h-full rounded-full transition-all duration-1000 ${usagePercent >= 80 ? 'bg-error' : usagePercent >= 60 ? 'bg-warning' : 'bg-primary'}`} 
                      style={{ width: `${usagePercent}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center py-1 px-4 justify-between pointer-events-none">
                     <span className="text-[10px] font-black uppercase tracking-widest text-primary-content mix-blend-difference">{usagePercent.toFixed(1)}% Used</span>
                  </div>
              </div>
              <div className="flex justify-between mt-3">
                 <p className="text-xs font-black opacity-50 uppercase tracking-widest">{usagePercent.toFixed(1)}% Used</p>
                 <p className="text-xs font-black opacity-50 uppercase tracking-widest text-primary">{formatBytes(pgmap.bytes_avail)} Available</p>
              </div>
           </div>
        </div>

        {/* ── MONITORS, MGR & PGs DETAILS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monitors List */}
            <div className="bg-base-100 border border-base-300 rounded-[2rem] p-8">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3 mb-6">
                    <Server size={20} className="text-info" />
                    Monitors
                </h2>
                <div className="space-y-4">
                    {monmap?.mons?.map((mon: any, idx: number) => {
                        const inQuorum = cephData?.quorum_names?.includes(mon.name);
                        return (
                            <div key={idx} className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl border border-transparent hover:border-base-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                        inQuorum ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
                                    }`}>
                                        {inQuorum ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black uppercase tracking-tight text-lg leading-none mb-1">
                                            {mon.name}
                                        </h3>
                                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                                            {mon.addr.split('/')[0]}
                                        </p>
                                    </div>
                                </div>
                                <div className={`badge badge-sm font-black text-[9px] uppercase tracking-widest py-3 px-3 shadow-none border-none ${
                                    inQuorum ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                }`}>
                                    {inQuorum ? 'Quorum' : 'Out'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Manager Daemon & Modules */}
            <div className="bg-base-100 border border-base-300 rounded-[2rem] p-8">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3 mb-6">
                    <Activity size={20} className="text-accent" />
                    Manager Daemons
                </h2>
                <div className="space-y-4">
                    {/* Active Daemon */}
                    <div className="p-4 bg-base-200/50 rounded-2xl border border-transparent hover:border-base-300 transition-colors">
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-3">Active Daemon</p>
                        <div className="flex items-center gap-4">
                           <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                mgrmap?.available ? 'bg-success/10 border-success/20 text-success' : 'bg-warning/10 border-warning/20 text-warning'
                            }`}>
                                {mgrmap?.available ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                            </div>
                            <div>
                                <p className="font-black uppercase tracking-tight text-lg leading-none mb-1">{mgrmap?.active_name || 'N/A'}</p>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{mgrmap?.active_addr?.split('/')[0] || 'Unknown IP'}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Active Modules */}
                    <div className="pt-2">
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-3">Active Modules ({mgrmap?.modules?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                            {mgrmap?.modules?.map((mod: string, idx: number) => (
                                <span key={idx} className="badge badge-sm badge-outline font-black text-[9px] uppercase tracking-widest py-3 px-3 shadow-sm border-base-300 bg-base-100">
                                    {mod}
                                </span>
                            ))}
                            {(!mgrmap?.modules || mgrmap.modules.length === 0) && (
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">No active modules</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PG Status List */}
            <div className="bg-base-100 border border-base-300 rounded-[2rem] p-8">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3 mb-6">
                    <PieChart size={20} className="text-secondary" />
                    PG States
                </h2>
                <div className="space-y-4">
                    {pgmap?.pgs_by_state?.map((pg: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-base-200/50 rounded-2xl border border-transparent hover:border-base-300 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-base-300 text-base-content/50">
                                    <PieChart size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight text-lg leading-none mb-1">
                                        {pg.state_name}
                                    </h3>
                                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                                        Status
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-end flex-col">
                                <p className="text-xl font-black">{pg.count}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Count</p>
                            </div>
                        </div>
                    ))}
                    {(!pgmap?.pgs_by_state || pgmap.pgs_by_state.length === 0) && (
                         <div className="text-center py-6">
                             <p className="text-xs font-black uppercase tracking-widest opacity-40">No PG states found</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
