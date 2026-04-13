import { prisma } from '@/src/lib/prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // 1. Cari level_id untuk 'USR'
    const userLevel = await prisma.level.findUnique({
      where: { level_code: 'USR' },
    });

    if (!userLevel) {
      return NextResponse.json({ error: "Level USR tidak ditemukan" }, { status: 500 });
    }

    // 2. Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan ke Database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        level_id: userLevel.level_id,
      },
    });

    return NextResponse.json({ message: "Registrasi berhasil", user: newUser.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}