import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Scale } from 'lucide-react';

const toc = [
  { href: '#definitions', label: '1. Definitions' },
  { href: '#eligibility', label: '2. Eligibility and account registration' },
  { href: '#role', label: '3. Our role and the services' },
  { href: '#bookings', label: '4. Bookings and reservations' },
  { href: '#prices', label: '5. Prices, payments, and fees' },
  { href: '#cancellations', label: '6. Cancellations, changes, and refunds' },
  { href: '#conduct', label: '7. User conduct' },
  { href: '#ip', label: '8. Intellectual property' },
  { href: '#privacy', label: '9. Privacy' },
  { href: '#disclaimers', label: '10. Disclaimers' },
  { href: '#liability', label: '11. Limitation of liability' },
  { href: '#indemnification', label: '12. Indemnification' },
  { href: '#termination', label: '13. Termination' },
  { href: '#law', label: '14. Governing law' },
  { href: '#misc', label: '15. Miscellaneous' },
] as const;

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/80 bg-linear-to-b from-primary/6 via-background to-background dark:from-primary/9">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <Scale className="size-3.5 text-primary" aria-hidden />
              Legal
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Terms of Use
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              AweTravel Limited — agreement governing your use of the AweTravel platform and related services.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 text-sm">
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last updated</p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">May 6, 2026</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Effective date</p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">May 6, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12">
          <Card className="mb-12 border-border/80 shadow-sm ring-1 ring-black/3 dark:ring-white/6">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">On this page</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Jump to a section. This document is provided for your records; please read it in full.
                  </p>
                </div>
              </div>
              <nav aria-label="Terms sections" className="mt-5">
                <ol className="grid gap-2 sm:grid-cols-2">
                  {toc.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </CardContent>
          </Card>

          <article className="space-y-12 text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base sm:leading-8">
            <div className="space-y-4">
              <p className="text-foreground">
                Welcome to AweTravel (the &ldquo;Platform&rdquo;), a web application operated by AweTravel Limited
                (&ldquo;AweTravel,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These Terms of Use
                (&ldquo;Terms&rdquo;) govern your access to and use of the Platform, including any associated websites,
                mobile applications, subdomains, and related services (collectively, the &ldquo;Services&rdquo;) for
                booking bus, train, plane tickets, and related travel services.
              </p>
              <p className="text-foreground">
                By accessing or using the Services, creating an account, making a booking, or otherwise interacting with
                the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If
                you do not agree to these Terms, you must not access or use the Services.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and AweTravel Limited. We reserve the right
                to update or modify these Terms at any time. We will notify you of material changes by posting the
                revised Terms on the Platform or via email. Your continued use of the Services after the effective date
                of any changes constitutes your acceptance of the revised Terms. Bookings made prior to the change will
                remain governed by the Terms in effect at the time of booking.
              </p>
            </div>

            <Separator />

            <section id="definitions" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">1. Definitions</h2>
              <dl className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:p-5">
                <div>
                  <dt className="font-semibold text-foreground">&ldquo;Booking&rdquo;</dt>
                  <dd className="mt-1 pl-0 sm:pl-0">
                    Any reservation for bus, train, plane tickets, or ancillary travel services made through the
                    Services.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">&ldquo;Travel Provider&rdquo;</dt>
                  <dd className="mt-1">
                    Third-party airlines, bus operators, train/rail companies, airports, stations, or other entities that
                    provide the actual transportation services.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">&ldquo;User,&rdquo; &ldquo;you,&rdquo; &ldquo;your&rdquo;</dt>
                  <dd className="mt-1">The individual or entity accessing or using the Services.</dd>
                </div>
              </dl>
            </section>

            <section id="eligibility" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                2. Eligibility and account registration
              </h2>
              <p>
                You must be at least 18 years old or the age of majority in your jurisdiction. By using the Services, you
                represent and warrant that you meet this requirement and have the legal capacity to enter into
                contracts.
              </p>
              <p>
                To use certain features like booking, you may need to create an Account. You agree to provide accurate,
                current, and complete information and to keep it updated. You are responsible for maintaining the
                confidentiality of your account credentials and for all activities under your Account.
              </p>
            </section>

            <section id="role" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                3. Our role and the services
              </h2>
              <p>
                AweTravel is an intermediary online platform that allows users to search, compare, and book travel
                services provided by independent third-party Travel Providers. We do not operate any transportation
                services ourselves and are not a carrier.
              </p>
              <p>
                All bookings create a direct contract between you and the relevant Travel Provider. The Travel Provider
                is solely responsible for fulfilling the travel service, including schedules, performance, safety,
                baggage, delays, cancellations, and refunds.
              </p>
              <p>
                We strive to provide accurate information but do not guarantee the accuracy, completeness, or
                availability of information provided by Travel Providers. Prices, availability, and schedules are
                subject to change until the booking is confirmed.
              </p>
            </section>

            <section id="bookings" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                4. Bookings and reservations
              </h2>
              <ul className="list-disc space-y-3 pl-5 marker:text-primary/80">
                <li>
                  You must review all details, including the Travel Provider&rsquo;s terms and conditions, before
                  confirming a booking.
                </li>
                <li>
                  A booking is only confirmed upon receipt of a confirmation email or ticket with a booking reference.
                </li>
                <li>
                  You are responsible for ensuring all passenger information (names, dates of birth, passport/ID details,
                  contact information) is accurate. Errors may result in denial of boarding or extra charges.
                </li>
                <li>The person making the booking is responsible for all passengers in the group.</li>
              </ul>
            </section>

            <section id="prices" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                5. Prices, payments, and fees
              </h2>
              <p>
                Prices shown include the base fare and applicable taxes and fees as indicated at the time of booking.
                Additional charges (baggage, seat selection, etc.) may apply according to the Travel Provider&rsquo;s
                policies.
              </p>
              <p>
                We may charge service or convenience fees, which will be clearly disclosed before payment. Payments are
                processed securely through third-party processors. You authorize us to charge the selected payment
                method.
              </p>
              <p>
                In case of obvious pricing errors, we or the Travel Provider reserve the right to cancel the booking and
                issue a full refund.
              </p>
            </section>

            <section id="cancellations" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                6. Cancellations, changes, refunds, and no-shows
              </h2>
              <p>
                Cancellations, modifications, and refunds are subject exclusively to the policies of the respective Travel
                Provider, which are displayed during the booking process. We act only as a facilitator and have no
                control over the Travel Provider&rsquo;s refund policies.
              </p>
              <p>
                You are responsible for understanding these policies before booking. We may charge an administrative fee
                for processing cancellation or change requests where permitted.
              </p>
            </section>

            <section id="conduct" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">7. User conduct</h2>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                <li>Make fraudulent or speculative bookings.</li>
                <li>Use automated tools, scraping, or unauthorized access methods.</li>
                <li>Post harmful, defamatory, or infringing content.</li>
                <li>Violate any applicable laws or third-party rights.</li>
                <li>Use the Services for commercial purposes without authorization.</li>
              </ul>
              <p>You are responsible for complying with all travel requirements (visas, health, immigration, etc.).</p>
            </section>

            <section id="ip" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                8. Intellectual property
              </h2>
              <p>
                All content, logos, trademarks, and software on the Platform are owned by AweTravel Limited or its
                licensors. You are granted a limited, revocable license to use the Services for personal, non-commercial
                use only.
              </p>
            </section>

            <section id="privacy" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">9. Privacy</h2>
              <p>
                Your use of the Services is also governed by our{' '}
                <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                , which is incorporated by reference.
              </p>
            </section>

            <section id="disclaimers" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">10. Disclaimers</h2>
              <p>
                The Services and all content are provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; without any
                warranties, express or implied. We do not warrant the performance of Travel Providers or the accuracy
                of information on the Platform.
              </p>
            </section>

            <section id="liability" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                11. Limitation of liability
              </h2>
              <p>
                To the maximum extent permitted by law, AweTravel Limited shall not be liable for any indirect,
                incidental, consequential, or punitive damages arising from your use of the Services or any bookings.
                Our total liability shall not exceed the amount paid by you to AweTravel for the relevant booking.
              </p>
            </section>

            <section id="indemnification" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">12. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless AweTravel Limited, its officers, directors, employees, and
                agents from any claims, damages, or expenses arising from your use of the Services, violation of these
                Terms, or infringement of third-party rights.
              </p>
            </section>

            <section id="termination" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">13. Termination</h2>
              <p>
                We may suspend or terminate your access to the Services at any time for any reason. You may terminate
                your account by contacting support.
              </p>
            </section>

            <section id="law" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">14. Governing law</h2>
              <p>
                These Terms are governed by the laws of the Republic of Uganda. Any disputes shall be resolved in the
                courts of Kampala, Uganda.
              </p>
            </section>

            <section id="misc" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">15. Miscellaneous</h2>
              <p>Severability, waiver, and entire agreement clauses apply as standard.</p>
              <p>
                Contact us at{' '}
                <a
                  href="mailto:support@awetravel.com?subject=Terms%20of%20Use%20inquiry"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  support@awetravel.com
                </a>{' '}
                for any questions.
              </p>
            </section>

            <Separator />

            <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-4 text-center text-sm font-medium text-foreground sm:px-6">
              By using AweTravel, you confirm that you have read and agree to these Terms of Use.
            </p>
          </article>

          <div className="mt-14 flex flex-wrap gap-3">
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
