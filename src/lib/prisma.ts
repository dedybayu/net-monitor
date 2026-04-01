import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// 1. Inisialisasi Pool dengan tipe yang jelas
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Buat adapter
const adapter = new PrismaPg(pool);

// 3. Definisikan tipe untuk global object agar tidak menggunakan 'unknown'
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined 
};

// 4. Inisialisasi Prisma dengan adapter tanpa 'as any'
// Kita hanya perlu memastikan PrismaClient tahu kita menggunakan driver adapter
export const prisma =
  globalForPrisma.prisma ?? 
  new PrismaClient({ 
    adapter 
  });

// 5. Simpan ke global jika di environment development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}