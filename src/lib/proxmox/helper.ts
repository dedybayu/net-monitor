import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/client';
import { getProxmoxClient } from '@/src/lib/proxmox/client';
import { decrypt } from '@/src/lib/security/encryption';
import { AxiosError, AxiosInstance } from 'axios';

interface ProxmoxApiError {
  errors?: Record<string, string>;
  message?: string;
}

/**
 * Helper dengan Type-Safety tinggi.
 * <T> adalah Generic untuk tipe data yang dikembalikan oleh API Proxmox.
 */
export async function withProxmoxClient<T>(
  id: string,
  callback: (client: AxiosInstance) => Promise<T>
): Promise<NextResponse> {
  try {
    const proxmoxId = parseInt(id, 10);
    if (isNaN(proxmoxId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    // 1. Ambil & Validasi Koneksi
    const connection = await prisma.proxmox.findUnique({
      where: { proxmox_id: proxmoxId },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
    }

    // 2. Inisialisasi Client
    const decryptedSecret = decrypt(connection.proxmox_token_secret);
    
    // Asumsikan getProxmoxClient mengembalikan AxiosInstance atau kita casting di sini
    const client = getProxmoxClient({
      host: connection.proxmox_host,
      port: connection.proxmox_port,
      username: connection.proxmox_username,
      tokenName: connection.proxmox_token_name,
      tokenSecret: decryptedSecret,
    }) as AxiosInstance;

    // 3. Jalankan callback dan return hasilnya
    const data = await callback(client);
    return NextResponse.json(data);

  } catch (error: unknown) {
    let errorMessage = 'Gagal menghubungkan ke Proxmox';
    let errorDetails: unknown = null;

    if (error instanceof AxiosError) {
      const proxmoxError = error.response?.data as ProxmoxApiError;
      errorDetails = proxmoxError?.errors || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails }, 
      { status: 500 }
    );
  }
}