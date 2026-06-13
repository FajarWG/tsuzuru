import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isApiPage = pathname.startsWith("/api");

  // If not logged in and trying to access app pages, redirect to login
  if (!isLoggedIn && !isAuthPage && !isApiPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    const dashboardUrl = new URL("/", req.nextUrl);
    return Response.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|.*\\.(?:png|svg|ico)$).*)",
  ],
};
