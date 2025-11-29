import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Skeleton */}
          <div className="mb-12">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          {/* Quick Actions Skeleton */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Skeleton className="w-12 h-12 rounded-xl mb-4" />
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Skeleton className="w-12 h-12 rounded-xl mb-4" />
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

