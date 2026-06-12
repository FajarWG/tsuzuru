import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  // Redirect if user is already authenticated
  if (session) {
    redirect("/");
  }

  async function handleGoogleLogin() {
    "use server";
    await signIn("google");
  }

  return (
    <div className="flex-1 w-full max-w-[430px] mx-auto min-h-screen bg-background shadow-2xl border-x border-border/20 flex flex-col justify-between p-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      {/* Branding Section */}
      <div className="flex-1 flex flex-col justify-center items-center text-center mt-12">
        <h1 className="font-sans text-6xl font-bold tracking-widest text-primary mb-4">
          綴る
        </h1>
        <p className="font-sans text-sm text-muted-foreground tracking-widest uppercase mb-1">
          Tsuzuru
        </p>
        <div className="w-12 h-[1px] bg-secondary my-6" />
        <p className="font-sans text-xl text-foreground tracking-wider leading-relaxed">
          お金の物語を綴ろう
        </p>
        <p className="text-xs text-muted-foreground font-sans tracking-wide mt-2">
          Weave your money story
        </p>
      </div>

      {/* Login Buttons */}
      <div className="flex flex-col gap-4 mb-12 relative z-10 w-full">
        <form action={handleGoogleLogin}>
          <button
            type="submit"
            className="w-full h-12 rounded-xl border border-border bg-white text-foreground hover:bg-muted font-sans font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-sm active:translate-y-[1px] duration-150 cursor-pointer"
          >
            {/* Google Icon */}
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-muted-foreground/60 font-sans pb-4">
        © 2026 Tsuzuru. Weave your money story.
      </footer>
    </div>
  );
}
