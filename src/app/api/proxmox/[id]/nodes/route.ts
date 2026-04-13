// app/api/proxmox/[id]/nodes/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getProxmoxClient } from '@/src/lib/proxmox';
import { decrypt } from '@/src/lib/encryption';
import { AxiosError } from 'axios';

// Definisi Interface untuk Response Error Proxmox
interface ProxmoxApiError {
  errors?: Record<string, string>;
  message?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const proxmoxId = parseInt(resolvedParams.id, 10);

    if (isNaN(proxmoxId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    // 1. Ambil data koneksi dari Database
    const connection = await prisma.proxmox.findUnique({
      where: { proxmox_id: proxmoxId },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Koneksi tidak ditemukan' }, { status: 404 });
    }

    // 2. Dekripsi token_secret
    const decryptedSecret = decrypt(connection.proxmox_token_secret);

    // 3. Inisialisasi client Proxmox
    const client = getProxmoxClient({
      host: connection.proxmox_host,
      port: connection.proxmox_port,
      username: connection.proxmox_username,
      tokenName: connection.proxmox_token_name,
      tokenSecret: decryptedSecret,
    });

    // 4. Panggil API Proxmox untuk status cluster
    // Menentukan tipe return secara eksplisit jika perlu, atau biarkan inferensi Axios
    const response = await client.get('/nodes');

    console.log('Proxmox API Response:', response.data); // Debug log untuk response API
    return NextResponse.json(response.data);

  } catch (error: unknown) {
    // 5. Handling Error dengan Type Guard
    let errorMessage = 'Gagal menghubungkan ke Proxmox';
    let errorDetails: unknown = null;

    if (error instanceof AxiosError) {
      const proxmoxError = error.response?.data as ProxmoxApiError;
      console.error('Proxmox API Error:', proxmoxError || error.message);
      errorDetails = proxmoxError?.errors || error.message;
    } else if (error instanceof Error) {
      console.error('General Error:', error.message);
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails 
      },
      { status: 500 }
    );
  }
}