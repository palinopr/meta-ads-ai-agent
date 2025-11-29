"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-4">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Link href="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-8">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}

