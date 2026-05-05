import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="text-sm font-medium text-muted-foreground">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Privacy policy</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We respect your privacy. This policy explains what information we collect when you use AweTravel
            and how we use it.
          </p>
          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
              <p>
                We collect information you provide (such as name, email, and booking details), technical data
                needed to run the service (such as device and log data), and information from partners that
                help us process payments and authenticate users.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">How we use information</h2>
              <p>
                We use data to operate the marketplace, complete bookings, communicate about your trips,
                improve security, and comply with legal obligations. We do not sell your personal information.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Retention &amp; security</h2>
              <p>
                We retain information only as long as needed for the purposes above or as required by law. We
                use industry-standard safeguards, though no online service can guarantee perfect security.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Contact</h2>
              <p>
                For privacy questions, contact us at{' '}
                <a
                  href="mailto:support@awetravel.com?subject=Privacy%20inquiry"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  support@awetravel.com
                </a>
                .
              </p>
            </section>
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/terms">Terms of use</Link>
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
