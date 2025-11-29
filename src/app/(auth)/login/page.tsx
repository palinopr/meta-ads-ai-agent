import Link from "next/link";
import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary">Meta Ads AI</h1>
          </Link>
          <p className="text-muted-foreground mt-2">
            Sign in to manage your campaigns
          </p>
        </div>

        {/* Card */}
        <div className="bg-secondary/50 border border-border rounded-2xl p-8 backdrop-blur-sm">
          {/* Error/Message Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
              {message}
            </div>
          )}

          <form className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                formAction={login}
                className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all"
              >
                Sign In
              </button>
              <button
                formAction={signup}
                className="w-full px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold rounded-xl transition-all border border-border"
              >
                Create Account
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-secondary/50 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login - Direct Meta OAuth */}
          <a
            href="/api/auth/meta"
            className="w-full px-4 py-3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Meta
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing in, you agree to our{" "}
          <Link href={"/terms" as never} className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href={"/privacy" as never} className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

