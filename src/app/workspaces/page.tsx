"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Workspace {
  workspace_id: number;
  workspace_name: string;
  workspace_description: string;
  permission: string;
  created_at?: string;
}

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 font-bold animate-pulse">Loading Workspaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6 md:p-10 font-sans">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-base-content">
            MY <span className="text-primary">WORKSPACES</span>
          </h1>
          <p className="text-sm opacity-50 font-medium">Manage your network environments</p>
        </div>
        <button className="btn btn-primary shadow-lg shadow-primary/20 gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Create New
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        {workspaces.length === 0 ? (
          <div className="bg-base-100 rounded-3xl p-20 text-center border-2 border-dashed border-base-300">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold">No Workspaces Found</h3>
            <p className="opacity-60 mb-6">You havent been assigned to any workspace yet.</p>
            <button className="btn btn-outline btn-sm">Refresh Data</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <div
                key={ws.workspace_id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 group overflow-hidden"
              >
                <div className="card-body p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl">
                      {ws.workspace_name.charAt(0)}
                    </div>
                    <div className="badge badge-outline text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      {ws.permission}
                    </div>
                  </div>

                  <h2 className="card-title text-2xl font-black truncate">
                    {ws.workspace_name}
                  </h2>
                  <p className="text-sm opacity-60 line-clamp-2 min-h-[40px]">
                    {ws.workspace_description || "No description provided for this workspace."}
                  </p>

                  <div className="card-actions justify-end mt-6 pt-4 border-t border-base-200">
                    <label
                      htmlFor="ws_modal"
                      className="btn btn-ghost btn-sm font-bold text-primary"
                      onClick={() => setSelectedWs(ws)}
                    >
                      Quick View
                    </label>
                    <Link href={`/workspaces/${ws.workspace_id}/dashboard`} className="btn btn-primary btn-sm px-6">
                      Open Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETAIL */}
      <input type="checkbox" id="ws_modal" className="modal-toggle" />
      <div className="modal modal-bottom sm:modal-middle" role="dialog">
        <div className="modal-box border border-base-300 shadow-2xl p-0 overflow-hidden">
          {selectedWs && (
            <>
              <div className="bg-primary p-8 text-primary-content">
                <div className="badge badge-outline border-white/50 text-white mb-2">{selectedWs.permission}</div>
                <h3 className="text-3xl font-black tracking-tight">{selectedWs.workspace_name}</h3>
              </div>
              <div className="p-8">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Description</h4>
                <p className="text-base-content/80 leading-relaxed mb-6">
                  {selectedWs.workspace_description || "This workspace has no detailed description recorded."}
                </p>
                
                <div className="stats stats-vertical lg:stats-horizontal border border-base-200 w-full mb-6">
                  <div className="stat px-4 py-2">
                    <div className="stat-title text-[10px] uppercase font-bold">Workspace ID</div>
                    <div className="stat-value text-lg">#{selectedWs.workspace_id}</div>
                  </div>
                  <div className="stat px-4 py-2">
                    <div className="stat-title text-[10px] uppercase font-bold">Access Level</div>
                    <div className="stat-value text-lg text-primary">{selectedWs.permission}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    href={`/workspaces/${selectedWs.workspace_id}/dashboard`} 
                    className="btn btn-primary flex-1 font-bold"
                  >
                    Enter Dashboard
                  </Link>
                  <button className="btn btn-warning flex-1 font-bold">
                    Edit Settings
                  </button>
                </div>
              </div>
            </>
          )}
          <div className="modal-action absolute top-2 right-4">
            <label htmlFor="ws_modal" className="btn btn-circle btn-sm btn-ghost text-white">✕</label>
          </div>
        </div>
        <label className="modal-backdrop" htmlFor="ws_modal">Close</label>
      </div>
    </div>
  );
}