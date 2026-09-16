import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { database } from "./lib/database.ts";
import { authorizeStaffCredentials } from "./admin/credentials.ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: Number(process.env.CXA_ADMIN_SESSION_MAX_AGE ?? 28_800) },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-cxa-admin-session" : "cxa-admin-session",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    authorize: authorizeStaffCredentials,
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.staffUserId = user.id; return token; },
    async session({ session, token }) {
      if (!token.staffUserId || typeof token.staffUserId !== "string") return session;
      const staff = await database.staffUser.findUnique({ where: { id: token.staffUserId }, select: { id: true, email: true, name: true, role: true, active: true } });
      if (!staff?.active) {
        session.user.id = "";
        session.user.role = "READ_ONLY";
        return session;
      }
      session.user.id = staff.id;
      session.user.email = staff.email;
      session.user.name = staff.name;
      session.user.role = staff.role;
      return session;
    },
  },
});
