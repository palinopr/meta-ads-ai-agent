import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Zap, Shield, BarChart3, Users, Target } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">Meta Ads AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            AI-Powered Meta Ads Management
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
              AI Media Buyer
            </span>{" "}
            for Meta Ads
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl">
            Connect your Meta Ads account and manage campaigns through natural
            conversation. No complex dashboards, just tell the AI what you need.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg rounded-xl">
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="pt-12 flex items-center gap-8 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Free tier available</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Natural Conversation"
            description="Just chat with your AI agent like you would with a media buyer. No learning curve."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Instant Insights"
            description="Get real-time performance data, recommendations, and optimizations in seconds."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Safe Actions"
            description="AI confirms before making changes to budgets or pausing campaigns."
          />
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon={<Users className="w-6 h-6" />}
              title="Connect Your Account"
              description="Securely link your Meta Ads account with OAuth. Your data stays safe."
            />
            <StepCard
              step={2}
              icon={<MessageSquare className="w-6 h-6" />}
              title="Chat with AI"
              description="Ask questions, request changes, and get insights in natural language."
            />
            <StepCard
              step={3}
              icon={<BarChart3 className="w-6 h-6" />}
              title="Watch Performance"
              description="See your campaigns improve as AI helps optimize your advertising."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Ads?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of marketers who are already using AI to manage their Meta Ads more efficiently.
            </p>
            <Link href="/login">
              <Button size="lg" className="px-8 py-6 text-lg rounded-xl">
                Start Free Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold">Meta Ads AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Meta Ads AI Agent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-secondary/50 border border-border hover:border-primary/50 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 text-primary transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {step}
      </div>
      <div className="p-6 pt-8 rounded-2xl bg-secondary/30 border border-border">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
