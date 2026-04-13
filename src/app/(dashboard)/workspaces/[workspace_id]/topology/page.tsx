'use client';

import { TopologyEditor } from './TopologyEditor';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';

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

export default function TopologyPage() {
  const params = useParams();
  const workspace_id = params?.workspace_id as string;
  const workspaceIdInt = parseInt(workspace_id, 10);

  const { data: wsData, error: wsError, isLoading: wsLoading } = useSWR(
    workspaceIdInt ? `/api/workspaces/${workspaceIdInt}` : null,
    getFetcher
  );

  if (wsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-300 gap-4 pt-16 lg:pl-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm font-bold tracking-widest animate-pulse uppercase">
          Verifying Topology Access...
        </p>
      </div>
    );
  }

  if (wsError) {
    const status = wsError.status;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-base-200 text-center pt-16 lg:pl-64">
        <div className="max-w-md">
          <div className="text-9xl font-black text-primary/20 mb-4">{status || '500'}</div>
          <h1 className="text-3xl font-bold mb-2">{wsError.message}</h1>
          <p className="text-base-content/60 mb-8">
            {status === 404
              ? "Workspace tidak ditemukan atau telah dihapus."
              : "Anda tidak memiliki izin untuk mengelola topologi di workspace ini."}
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/workspaces" className="btn btn-primary px-8">
              My Workspaces
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TopologyEditor dibungkus wrapper offset agar tidak tertutup sidebar & navbar
  return (
    <div className="pt-16 lg:pl-64">
      <TopologyEditor
        workspaceId={workspaceIdInt}
        workspaceName={wsData?.data.workspace_name || 'Workspace'}
        workspaceDescription={wsData?.data.workspace_description || ''}
      />
    </div>
  );
}