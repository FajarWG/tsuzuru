import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  
  // Clear all NextAuth related cookies
  cookieStore.getAll().forEach((cookie) => {
    if (
      cookie.name.includes("session-token") ||
      cookie.name.includes("csrf-token") ||
      cookie.name.includes("callback-url")
    ) {
      cookieStore.delete(cookie.name);
    }
  });

  const requestUrl = new URL(request.url);
  const loginUrl = new URL("/login", requestUrl.origin);
  
  return NextResponse.redirect(loginUrl);
}
