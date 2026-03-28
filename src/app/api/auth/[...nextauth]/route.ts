import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { level: true } // Ambil data level (ADM, NOC, USR)
        });

        if (!user) return null;

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) return null;

        return {
          id: user.user_id.toString(),
          name: user.name,
          email: user.email,
          role: user.level.level_code, // Simpan ADM/NOC/USR di sini
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 'user' sekarang sudah memiliki tipe 'role' dari definisi di atas
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // 'session.user' dan 'token' sekarang sudah mengenali 'role'
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 jam
    updateAge: 0, // Nonaktifkan refresh otomatis
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };