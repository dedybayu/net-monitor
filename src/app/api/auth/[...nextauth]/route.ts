import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/prisma/client";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
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
          include: { level: true }
        });

        if (!user) return null;

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) return null;

        // Data yang di-return di sini harus sesuai dengan interface User di d.ts
        return {
          id: user.user_id.toString(),
          name: user.name,
          email: user.email,
          role: user.level.level_code,
          role_name: user.level.level_name,
          image: user.profile_picture
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 'user' di sini otomatis bertipe 'User' yang kita declare di d.ts
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.role_name = user.role_name;
      }
      return token;
    },
    async session({ session, token }) {
      // 'token' di sini otomatis memiliki 'id' dan 'role' karena Module Augmentation
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.role_name = token.role_name;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };