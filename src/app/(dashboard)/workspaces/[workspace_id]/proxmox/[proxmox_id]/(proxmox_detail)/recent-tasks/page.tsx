'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { format } from 'date-fns';
import { ProxmoxTask } from '@/src/types/proxmox/resources';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Activity, Server, User, Terminal, AlertTriangle } from 'lucide-react';

export default function RecentTasksPage({ params }: { params: Promise<{ proxmox_id: string, workspace_id: string }> }) {
    const { proxmox_id: proxmoxId, workspace_id: workspaceId } = use(params);
    const [tasks, setTasks] = useState<ProxmoxTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    useEffect(() => {
        if (!proxmoxId) return;

        const fetchTasks = async (isInitial = false) => {
            if (isInitial) setLoading(true);
            try {
                const res = await fetch(`/api/proxmox/${proxmoxId}/recent-tasks`);
                const json: { data: ProxmoxTask[] } = await res.json();
                if (json.data) {
                    // Urutkan dari yang terbaru (starttime paling besar ke kecil)
                    const sortedData = json.data.sort((a, b) => b.starttime - a.starttime);
                    setTasks(sortedData);
                }
            } catch (err) {
                console.error("Failed to fetch tasks:", err);
            } finally {
                if (isInitial) setLoading(false);
            }
        };

        fetchTasks(true);
        const interval = setInterval(() => fetchTasks(false), 10000);
        return () => clearInterval(interval);
    }, [proxmoxId]);

    // Reset ke halaman 1 jika user melakukan pencarian
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    // Filtering
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => 
            t.type.toLowerCase().includes(search.toLowerCase()) ||
            t.user.toLowerCase().includes(search.toLowerCase()) ||
            t.node.toLowerCase().includes(search.toLowerCase()) ||
            t.id?.toLowerCase().includes(search.toLowerCase())
        );
    }, [tasks, search]);

    // Logic Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    if (loading) return (
        <div className="min-h-screen z-1 flex flex-col items-center justify-center bg-base-200 lg:pl-72 pt-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] opacity-40 animate-pulse">Syncing Logs...</p>
        </div>
    );

    return (
        <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans lg:pl-72 pt-10 transition-all cursor-default">
            <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
                
                {/* ── HEADER ── */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href={`/workspaces/${workspaceId}/proxmox/${proxmoxId}`} className="btn btn-sm btn-ghost btn-circle bg-base-300/50">
                            <ArrowLeft size={16} />
                        </Link>
                        <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 m-0 flex items-center gap-2">
                            <span className="inline-block h-px w-6 bg-primary"></span>
                            System Logs
                        </p>
                    </div>

                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none text-base-content mb-2 flex items-center gap-4">
                                Recent <span className="text-primary">Tasks</span>
                            </h1>
                            <p className="text-sm opacity-50 font-medium">
                                Real-time audit trail and cluster activity monitor
                            </p>
                        </div>
                        <div className="relative w-full xl:w-96">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search type, user, node, ID..."
                                className="input input-lg w-full rounded-2xl bg-base-100 shadow-sm border-base-300 focus:border-primary pl-12 font-bold transition-all placeholder:font-medium placeholder:uppercase placeholder:tracking-widest placeholder:text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {filteredTasks.length === 0 ? (
                    /* ── EMPTY STATE ── */
                    <div className="flex flex-col items-center justify-center py-32 bg-base-100/50 rounded-[3rem] border-2 border-dashed border-base-300 opacity-60 mt-10">
                        <div className="bg-base-200 p-6 rounded-full mb-6">
                            <Search size={48} className="opacity-20 text-primary" />
                        </div>
                        <h3 className="font-black text-2xl tracking-tight uppercase opacity-40 mb-2">No Match Found</h3>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Log records for "{search}" don't exist.</p>
                    </div>
                ) : (
                    /* ── TABLE CARD ── */
                    <div className="bg-base-100 border border-base-300 rounded-[2rem] overflow-hidden shadow-xl mt-10">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-base-200/50">
                                    <tr className="border-b border-base-300 text-[10px] font-black uppercase tracking-widest opacity-50">
                                        <th className="py-5 pl-8">Time Scope</th>
                                        <th>Target Node</th>
                                        <th>Action Task</th>
                                        <th>Status Indicator</th>
                                        <th className="pr-8 text-right">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-bold">
                                    {currentItems.map((task) => {
                                        const isOK = task.status === 'OK';
                                        const duration = task.endtime ? task.endtime - task.starttime : 0;
                                        const taskDate = new Date(task.starttime * 1000);
                                        
                                        return (
                                            <tr key={task.upid} className="border-b border-base-300/50 hover:bg-base-200/50 transition-colors group">
                                                {/* Time Scope */}
                                                <td className="whitespace-nowrap pl-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-base-200/80 p-2 rounded-xl text-base-content/40 group-hover:text-primary transition-colors">
                                                            <Activity size={16} />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-black tracking-tight">{format(taskDate, 'MMM dd, yyyy')}</span>
                                                            <span className="font-mono text-[10px] opacity-60">{format(taskDate, 'HH:mm:ss')}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Target Node */}
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1.5 uppercase tracking-tighter text-[13px] font-black">
                                                            <Server size={12} className="opacity-40" />
                                                            {task.node}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[9px] opacity-40 font-bold uppercase tracking-widest">
                                                            <User size={10} />
                                                            {task.user}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Action Task */}
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1.5 uppercase tracking-tighter text-[13px] font-black text-primary group-hover:text-primary transition-colors">
                                                            <Terminal size={12} className="opacity-40" />
                                                            {task.type}
                                                        </span>
                                                        {task.id && (
                                                            <span className="bg-base-200 border border-base-300 px-2 py-0.5 rounded-md text-[9px] w-fit font-mono font-bold opacity-60 flex items-center gap-1">
                                                                ID: {task.id}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status Indicator */}
                                                <td className="max-w-md xl:max-w-2xl">
                                                    <div className="flex flex-col items-start gap-1.5 w-full">
                                                        <div className={`badge badge-sm font-black uppercase text-[9px] tracking-widest px-3 py-2.5 rounded-lg border-none ${
                                                            isOK ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                                                        }`}>
                                                            {isOK ? <CheckCircle size={10} className="mr-1" /> : <XCircle size={10} className="mr-1 animate-pulse" />}
                                                            {isOK ? 'SUCCESS' : 'ERROR'}
                                                        </div>
                                                        
                                                        {/* Detail Error mungil jika tidak OK */}
                                                        {!isOK && (
                                                            <div className="group relative w-full">
                                                                <p className="text-[10px] text-error flex items-start gap-1 leading-tight font-medium line-clamp-1 opacity-80 hover:line-clamp-none hover:opacity-100 transition-all cursor-help bg-error/5 p-2 rounded-lg border border-error/10 w-full max-w-full">
                                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                                                    {task.status}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Duration */}
                                                <td className="text-right pr-8">
                                                    <div className="inline-flex items-center gap-1.5 bg-base-200 px-3 py-1.5 rounded-xl border border-base-300 font-mono text-[10px] opacity-70">
                                                        <Clock size={12} className="opacity-50" />
                                                        {duration}s
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── PAGINATION CONTROLS ── */}
                        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-base-200/30 border-t border-base-300 gap-4">
                            <span className="text-[10px] font-black uppercase opacity-40 tracking-widest bg-base-200 px-3 py-1.5 rounded-lg border border-base-300">
                                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTasks.length)} of {filteredTasks.length} Logs
                            </span>
                            <div className="join shadow-sm border border-base-300 rounded-xl overflow-hidden">
                                <button 
                                    className="join-item btn btn-sm bg-base-100 border-none hover:bg-base-200 text-xs w-10 font-black px-0" 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    «
                                </button>
                                <button className="join-item btn btn-sm bg-base-100 border-none hover:bg-base-100 text-[10px] font-black tracking-widest uppercase cursor-default px-6 opacity-60">
                                    Page {currentPage} of {totalPages}
                                </button>
                                <button 
                                    className="join-item btn btn-sm bg-base-100 border-none hover:bg-base-200 text-xs w-10 font-black px-0" 
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}