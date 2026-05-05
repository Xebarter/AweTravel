'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeAdBanner } from '@/components/site/HomeAdBanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { MapPin, Users, TrendingUp, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (user && router.prefetch) {
      router.prefetch(getHomePathForProfile(profile));
    }
  }, [user, profile, router]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <HomeAdBanner />

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
            <div className="flex min-h-12 flex-col gap-4 sm:min-h-11 sm:flex-row sm:items-center">
              {isLoading ? (
                <>
                  <div
                    className="h-11 w-full max-w-44 animate-pulse rounded-md bg-muted sm:w-44"
                    aria-hidden
                  />
                  <div
                    className="h-11 w-full max-w-26 animate-pulse rounded-md bg-muted sm:w-28"
                    aria-hidden
                  />
                </>
              ) : user ? (
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent-dark"
                  onClick={() => router.push(getHomePathForProfile(profile))}
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
            <div className="relative flex aspect-square w-full items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-accent/20">
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
          {!isLoading && !user && (
            <Link href="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent-dark">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
