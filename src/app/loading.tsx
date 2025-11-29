import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}

