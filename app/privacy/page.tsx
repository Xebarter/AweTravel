import Link from 'next/link';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield } from 'lucide-react';

const toc = [
  { href: '#collect', label: '1. Information we collect' },
  { href: '#use', label: '2. How we use your information' },
  { href: '#sharing', label: '3. Sharing your information' },
  { href: '#legal-basis', label: '4. Legal basis for processing' },
  { href: '#retention', label: '5. Data retention' },
  { href: '#rights', label: '6. Your rights and choices' },
  { href: '#security', label: '7. Data security' },
  { href: '#international', label: '8. International data transfers' },
  { href: '#cookies', label: '9. Cookies and tracking' },
  { href: '#children', label: '10. Children’s privacy' },
  { href: '#third-party', label: '11. Third-party links' },
  { href: '#contact', label: '12. Contact us' },
] as const;

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/80 bg-linear-to-b from-primary/6 via-background to-background dark:from-primary/9">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <Shield className="size-3.5 text-primary" aria-hidden />
              Legal
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              AweTravel Limited — how we collect, use, and protect personal information when you use our platform.
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
              <nav aria-label="Privacy Policy sections" className="mt-5">
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
                This Privacy Policy explains how AweTravel Limited (&ldquo;AweTravel,&rdquo; &ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, discloses, and protects your personal information
                when you access or use our website, mobile application, or any other online services (collectively,
                the &ldquo;Platform&rdquo; or &ldquo;Services&rdquo;) for booking bus, train, plane tickets, and
                related travel services.
              </p>
              <p>
                By using the Services, you consent to the practices described in this Privacy Policy. If you do not
                agree with this Policy, please do not use the Platform.
              </p>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting
                the revised version on the Platform and updating the &ldquo;Last Updated&rdquo; date. We encourage you to
                review this Policy periodically.
              </p>
            </div>

            <Separator />

            <section id="collect" className="scroll-mt-24 space-y-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                1. Information we collect
              </h2>
              <p>We collect the following categories of information:</p>

              <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-foreground">1.1 Personal information you provide</h3>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                  <li>
                    <span className="font-medium text-foreground">Account information:</span> Name, email address, phone
                    number, password, date of birth, gender, nationality.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Booking information:</span> Passenger names, dates of
                    birth, passport/ID numbers, contact details, travel preferences, special requests (e.g., meal
                    preferences, accessibility needs).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Payment information:</span> Billing address, payment
                    card details (processed by third-party payment processors — we do not store full card numbers).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Communication data:</span> Messages, support requests,
                    feedback, reviews, and survey responses.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Identity verification data:</span> Government-issued
                    ID copies (where required by law or Travel Providers).
                  </li>
                </ul>
              </div>

              <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-foreground">1.2 Information collected automatically</h3>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                  <li>
                    <span className="font-medium text-foreground">Device and usage data:</span> IP address, device type,
                    operating system, browser type, device identifiers, app version.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Location data:</span> Approximate location derived from
                    IP address or GPS (with your consent where required).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Log data:</span> Access times, pages viewed, links
                    clicked, search queries.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Cookies and similar technologies:</span> See Section 9
                    below.
                  </li>
                </ul>
              </div>

              <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-foreground">1.3 Information from third parties</h3>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                  <li>
                    <span className="font-medium text-foreground">Travel Providers</span> (airlines, bus companies,
                    train operators): Booking status, ticket details, check-in information.
                  </li>
                  <li>Payment processors and fraud detection services.</li>
                  <li>Business partners and analytics providers.</li>
                  <li>Social media platforms (if you log in using social credentials).</li>
                </ul>
              </div>
            </section>

            <section id="use" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                2. How we use your information
              </h2>
              <p>We use the collected information for the following purposes:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                <li>To provide, operate, and improve the Services (search, booking, ticket issuance, itinerary management).</li>
                <li>To process transactions and send booking confirmations, tickets, and updates.</li>
                <li>To communicate with you regarding bookings, customer support, and important notices.</li>
                <li>To personalize your experience (saved searches, travel preferences, recommendations).</li>
                <li>
                  To send marketing communications (promotions, newsletters) — you may opt out at any time.
                </li>
                <li>To detect, prevent, and investigate fraud, security incidents, and violations of our Terms.</li>
                <li>
                  To comply with legal obligations, respond to court orders, government requests, and enforce our rights.
                </li>
                <li>To conduct analytics, research, and service improvements (aggregated or anonymized data).</li>
                <li>To facilitate communication between you and Travel Providers.</li>
              </ul>
            </section>

            <section id="sharing" className="scroll-mt-24 space-y-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                3. Sharing your information
              </h2>
              <p>We share your personal information in the following circumstances:</p>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">3.1 With Travel Providers</h3>
                <p>
                  We share necessary passenger and booking details with the relevant bus operators, airlines, train
                  companies, and other Travel Providers to fulfill your reservation. They may use this data according to
                  their own privacy policies.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">3.2 With service providers</h3>
                <p>We engage trusted third-party service providers who assist us with:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                  <li>Payment processing</li>
                  <li>Cloud hosting and infrastructure</li>
                  <li>Customer support tools</li>
                  <li>Email and SMS delivery</li>
                  <li>Analytics and marketing</li>
                  <li>Fraud detection and security</li>
                </ul>
                <p>
                  These providers are contractually obligated to protect your data and use it only for the services they
                  provide to us.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">3.3 For legal and safety reasons</h3>
                <p>
                  We may disclose information if required by law, regulation, legal process, or government request, or
                  to protect the rights, property, or safety of AweTravel, our users, or the public.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">3.4 Business transfers</h3>
                <p>
                  In the event of a merger, acquisition, reorganization, or sale of assets, your information may be
                  transferred as part of that transaction.
                </p>
              </div>

              <p className="font-medium text-foreground">
                We do not sell your personal information to third parties for monetary compensation.
              </p>
            </section>

            <section id="legal-basis" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                4. Legal basis for processing (where applicable)
              </h2>
              <p>Depending on your location, we may rely on the following legal bases:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                <li>Performance of a contract (e.g., processing your booking).</li>
                <li>Legitimate business interests (e.g., fraud prevention, service improvement).</li>
                <li>Your consent (e.g., marketing emails, certain cookies).</li>
                <li>Compliance with legal obligations.</li>
              </ul>
            </section>

            <section id="retention" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">5. Data retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this
                Policy, comply with legal obligations, resolve disputes, and enforce our agreements. Typically,
                booking-related data is kept for at least 7 years for accounting and legal purposes. You may request
                deletion of your data subject to legal exceptions.
              </p>
            </section>

            <section id="rights" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                6. Your rights and choices
              </h2>
              <p>You may have the following rights regarding your personal data (subject to applicable law):</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                <li>Access, correction, or deletion of your information.</li>
                <li>Objection to or restriction of certain processing.</li>
                <li>Data portability (where technically feasible).</li>
                <li>Withdrawal of consent (where processing is based on consent).</li>
                <li>Opt-out of marketing communications.</li>
              </ul>
              <p>
                To exercise these rights, contact us at the details provided in Section 12. We will respond within a
                reasonable timeframe.
              </p>
              <p>You can manage cookies and tracking preferences through your browser or device settings.</p>
            </section>

            <section id="security" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">7. Data security</h2>
              <p>
                We implement reasonable administrative, technical, and physical safeguards to protect your personal
                information. However, no security system is impenetrable. We cannot guarantee absolute security of your
                data.
              </p>
            </section>

            <section id="international" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                8. International data transfers
              </h2>
              <p>
                AweTravel Limited is based in Uganda. Your data may be transferred to, stored, and processed in other
                countries where our service providers operate. We ensure appropriate safeguards are in place for such
                transfers.
              </p>
            </section>

            <section id="cookies" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                9. Cookies and tracking technologies
              </h2>
              <p>We use cookies, pixels, web beacons, and similar technologies to:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-primary/80">
                <li>Enable essential Platform functions.</li>
                <li>Analyze usage and improve performance.</li>
                <li>Personalize content and advertising.</li>
                <li>Measure effectiveness of marketing campaigns.</li>
              </ul>
              <p>
                You can manage cookie preferences via our Cookie Consent Banner or your browser settings. Note that
                disabling certain cookies may affect Platform functionality.
              </p>
              <p>
                Third-party analytics and advertising partners (e.g., Google Analytics) may also set cookies. See their
                respective privacy policies.
              </p>
            </section>

            <section id="children" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                10. Children&rsquo;s privacy
              </h2>
              <p>
                The Services are not intended for individuals under 18 years of age. We do not knowingly collect personal
                information from children. If we become aware that we have collected data from a child without parental
                consent, we will take steps to delete it.
              </p>
            </section>

            <section id="third-party" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">11. Third-party links</h2>
              <p>
                The Platform may contain links to third-party websites or services. We are not responsible for the
                privacy practices of those third parties. We encourage you to review their privacy policies.
              </p>
            </section>

            <section id="contact" className="scroll-mt-24 space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">12. Contact us</h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
                please contact us at:
              </p>
              <div className="rounded-xl border border-border/70 bg-muted/25 p-4 sm:p-5">
                <p className="font-semibold text-foreground">AweTravel Limited</p>
                <p className="mt-3">
                  <span className="text-muted-foreground">Email: </span>
                  <a
                    href="mailto:privacy@awetravel.com?subject=Privacy%20Policy%20inquiry"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    privacy@awetravel.com
                  </a>
                </p>
                <p className="mt-2">
                  <span className="text-muted-foreground">Address: </span>
                  <span className="text-foreground">[Insert physical address, Kampala, Uganda]</span>
                </p>
                <p className="mt-3 text-sm">We will respond to your inquiry as soon as possible.</p>
              </div>
            </section>

            <Separator />

            <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-4 text-center text-sm font-medium text-foreground sm:px-6">
              By using AweTravel, you acknowledge that you have read and understood this Privacy Policy.
            </p>

            <p className="text-xs leading-relaxed text-muted-foreground">
              This is a comprehensive template. It is recommended to have it reviewed and customized by a qualified
              legal professional in your jurisdiction to ensure full compliance with applicable data protection laws
              (such as the Data Protection and Privacy Act of Uganda, GDPR if you serve EU users, or other relevant
              regulations).
            </p>
          </article>

          <div className="mt-14 flex flex-wrap gap-3">
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
