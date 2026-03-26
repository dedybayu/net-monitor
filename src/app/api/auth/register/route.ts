// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // 1. Validasi input sederhana
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    // 2. Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 400 });
    }

    // 3. Hash Password (Keamanan)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan ke Database
    // Secara default kita set level_id ke 2 (asumsi: USER_FREE)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        level_id: 2, // Sesuaikan dengan ID level_code 'USER_FREE' di DB-mu
      },
    });

    return NextResponse.json({ 
      message: 'Registrasi berhasil!', 
      user: { id: newUser.user_id, name: newUser.name, email: newUser.email } 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}