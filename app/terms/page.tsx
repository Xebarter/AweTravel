import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="text-sm font-medium text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Terms of use</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            These terms describe how you may use AweTravel. They are a summary for transparency; your
            operating agreements, carrier terms, and local regulations may also apply.
          </p>
          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">The platform</h2>
              <p>
                AweTravel provides software to help passengers discover routes and complete bookings with
                independent transport operators. We are a marketplace, not the carrier operating your trip.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Accounts &amp; eligibility</h2>
              <p>
                You agree to provide accurate information when you register and to keep your credentials secure.
                You are responsible for activity under your account.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Bookings &amp; payments</h2>
              <p>
                Fares, schedules, and seat availability are set by operators. Payment processing may be
                handled by third-party providers. Disputes about service quality or delays are primarily between
                you and the operator, though we may help facilitate communication where appropriate.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Changes</h2>
              <p>
                We may update these terms as the product evolves. Continued use of the service after changes
                constitutes acceptance of the updated terms.
              </p>
            </section>
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/privacy">Privacy policy</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
