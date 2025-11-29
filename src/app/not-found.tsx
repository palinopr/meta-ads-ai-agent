import { Button } from "@/components/ui/button";
import { Home, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link href="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

