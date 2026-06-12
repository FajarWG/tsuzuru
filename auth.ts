import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { seedUserFinancialData } from "@/lib/db-init";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      console.log("[Auth Callback: signIn] User details from provider:", user);
      if (!user.email) {
        console.error("[Auth Callback: signIn] Error: No user email available.");
        return false;
      }

      try {
        // Upsert the user in our database using Prisma
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
          },
        });
        console.log("[Auth Callback: signIn] Upserted DB User:", dbUser);

        // Seed default financial data if needed
        await seedUserFinancialData(dbUser.id);
        console.log("[Auth Callback: signIn] Completed seeding/checking financial data.");
        return true;
      } catch (error) {
        console.error("[Auth Callback: signIn] Google sign in callback error:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      console.log("[Auth Callback: jwt] Entry - Token:", token, "User:", user);
      if (user && user.email) {
        // Find the database user to set the database primary key (id) rather than Google provider ID
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          console.log("[Auth Callback: jwt] Looked up DB User:", dbUser);
          if (dbUser) {
            token.id = dbUser.id;
          } else {
            console.warn("[Auth Callback: jwt] Warning: DB User not found, falling back to provider user ID.");
            token.id = user.id;
          }
        } catch (error) {
          console.error("[Auth Callback: jwt] Error looking up DB user in JWT callback:", error);
          token.id = user.id;
        }
      }
      console.log("[Auth Callback: jwt] Exit - Token:", token);
      return token;
    },
    async session({ session, token }) {
      console.log("[Auth Callback: session] Entry - Session:", session, "Token:", token);
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      console.log("[Auth Callback: session] Exit - Session:", session);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
