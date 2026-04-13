'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { format } from 'date-fns';
import { ProxmoxTask } from '@/src/types/proxmox/resources';

export default function RecentTasksPage({ params }: { params: Promise<{ proxmox_id: string }> }) {
    const { proxmox_id: proxmoxId } = use(params);
    const [tasks, setTasks] = useState<ProxmoxTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
        <div className="min-h-screen flex items-center justify-center lg:pl-72 bg-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );

    return (
        <div className="min-h-screen bg-base-200 text-base-content font-sans p-6 pt-20 lg:pl-72 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Recent Tasks</h1>
                    <p className="text-[10px] opacity-50 font-bold uppercase tracking-[0.3em] mt-2">Sorted by latest activity</p>
                </div>
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="input input-bordered w-full rounded-2xl bg-base-100 shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-base-100 border border-base-300 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200/50">
                            <tr className="border-none text-[10px] font-black uppercase tracking-widest opacity-50">
                                <th>Start Time</th>
                                <th>Node / User</th>
                                <th>Task / ID</th>
                                <th>Status</th>
                                <th>Duration</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-bold">
    {currentItems.map((task) => {
        const isOK = task.status === 'OK';
        const duration = task.endtime ? task.endtime - task.starttime : 0;
        
        return (
            <tr key={task.upid} className="border-base-200 hover:bg-base-200/10 transition-colors">
                <td className="whitespace-nowrap opacity-60 font-mono">
                    {format(new Date(task.starttime * 1000), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td>
                    <div className="flex flex-col">
                        <span className="uppercase tracking-tighter text-primary">{task.node}</span>
                        <span className="text-[9px] opacity-40 font-normal">{task.user}</span>
                    </div>
                </td>
                <td>
                    <div className="flex flex-col">
                        <span className="uppercase tracking-tight">{task.type}</span>
                        {task.id && <span className="text-[9px] opacity-40 font-mono italic">ID: {task.id}</span>}
                    </div>
                </td>
                <td className="max-w-xs">
                    <div className="flex flex-col gap-1">
                        <div className={`badge badge-sm font-black uppercase text-[8px] tracking-widest ${isOK ? 'badge-success text-white' : 'badge-error text-white animate-pulse'}`}>
                            {isOK ? 'SUCCESS' : 'ERROR'}
                        </div>
                        
                        {/* Detail Error mungil jika tidak OK */}
                        {!isOK && (
                            <div className="group relative">
                                <p className="text-[10px] text-error leading-tight font-medium line-clamp-1 opacity-80 hover:line-clamp-none hover:opacity-100 transition-all cursor-help bg-error/5 p-1 rounded border border-error/10">
                                    {task.status}
                                </p>
                            </div>
                        )}
                    </div>
                </td>
                <td className="opacity-50 font-mono text-[10px]">
                    {duration}s
                </td>
            </tr>
        );
    })}
</tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-base-200">
                    <span className="text-[10px] font-bold uppercase opacity-40 tracking-widest">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTasks.length)} of {filteredTasks.length} Entries
                    </span>
                    <div className="join shadow-sm border border-base-300">
                        <button 
                            className="join-item btn btn-sm bg-base-100" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                        >
                            «
                        </button>
                        <button className="join-item btn btn-sm bg-base-100 no-animation">
                            Page {currentPage} of {totalPages}
                        </button>
                        <button 
                            className="join-item btn btn-sm bg-base-100" 
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>

            {filteredTasks.length === 0 && (
                <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest">
                    No matching logs found
                </div>
            )}
        </div>
    );
}