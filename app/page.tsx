'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { MapPin, Users, TrendingUp, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    if (router.prefetch) {
      router.prefetch('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">AweTravel</h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-accent hover:bg-accent-dark">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-balance leading-tight">
              Your Journey,{' '}
              <span className="text-accent">Simplified</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              AweTravel connects passengers and transport companies on a single platform. Find routes, compare prices, and book your tickets instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent-dark"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent-dark"
                    >
                      Start Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block p-8 bg-white rounded-xl shadow-lg mb-4">
                  <MapPin className="h-16 w-16 text-accent" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Safe & Reliable Travel</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-secondary/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose AweTravel?</h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Find Routes</h4>
              <p className="text-muted-foreground">
                Search from hundreds of routes and compare prices across multiple transport companies instantly.
              </p>
            </div>

            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Trusted Partners</h4>
              <p className="text-muted-foreground">
                Book with verified transport companies and enjoy secure, reliable travel experiences.
              </p>
            </div>

            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Best Prices</h4>
              <p className="text-muted-foreground">
                Get the best rates and enjoy transparent pricing with no hidden charges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Book Your Next Trip?</h3>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers and transport operators who trust AweTravel for safe, convenient, and affordable travel.
          </p>
          {!user && (
            <Link href="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent-dark">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>&copy; 2024 AweTravel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
