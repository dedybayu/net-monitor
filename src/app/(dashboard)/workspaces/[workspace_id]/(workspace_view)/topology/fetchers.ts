import { MonitoringTarget, StatusApiResponse } from './types';

export const statusFetcher = async (
  [url, targets]: [string, MonitoringTarget[]]
): Promise<StatusApiResponse> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets }),
  });
  if (!res.ok) throw new Error('Gagal fetch status');
  return res.json();
};

export const detailFetcher = (url: string) =>
  fetch(url).then((res) => res.json());