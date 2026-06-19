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
      if (!user.email) {
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

        // Seed default financial data if needed
        await seedUserFinancialData(dbUser.id);
        return true;
      } catch (error) {
        console.error("[Auth] Sign-in error for user:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user && user.email) {
        // Find the database user to set the database primary key (id) rather than Google provider ID
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
          } else {
            console.warn("[Auth] DB user not found during JWT callback, falling back to provider id.");
            token.id = user.id;
          }
        } catch (error) {
          console.error("[Auth] Error looking up DB user in JWT callback:", error);
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
