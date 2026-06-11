import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { seedUserFinancialData } from "@/lib/db-init";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "credentials",
      name: "Test User",
      credentials: {},
      async authorize() {
        try {
          const email = "test@example.com";
          // Upsert the test user
          const dbUser = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              name: "Test User",
              image: "https://api.dicebear.com/7.x/adventurer/svg?seed=test",
            },
          });

          // Seed default financial data if needed
          await seedUserFinancialData(dbUser.id);

          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            image: dbUser.image,
          };
        } catch (error) {
          console.error("Credentials authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // For credentials provider, authorize already did the upsert/seeding
      if (account?.provider === "credentials") {
        return true;
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
        console.error("Google sign in callback error:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user && user.email) {
        token.id = user.id;
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
