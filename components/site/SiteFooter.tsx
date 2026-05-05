import type { ComponentType } from 'react';
import Link from 'next/link';
import { Mail, MapPin, ShieldCheck, Bus, Ticket, Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { APP_CURRENCY_CODE } from '@/lib/currency';

const SUPPORT_EMAIL = 'support@awetravel.com';

type FooterLink = { href: string; label: string; external?: boolean };

const passengerLinks: FooterLink[] = [
  { href: '/signup', label: 'Create an account' },
  { href: '/login', label: 'Sign in to book' },
  { href: '/signup', label: 'Search routes & compare prices' },
  { href: '/login', label: 'View & manage bookings' },
];

const operatorLinks: FooterLink[] = [
  { href: '/signup', label: 'Register as a transporter' },
  { href: '/login', label: 'Operator sign in' },
  { href: '/signup', label: 'Fleet & vehicle management' },
  { href: '/signup', label: 'Routes, departures & schedules' },
];

const companyLinks: FooterLink[] = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Sign in' },
  { href: '/signup', label: 'Get started' },
  {
    href: `mailto:${SUPPORT_EMAIL}?subject=AweTravel%20inquiry`,
    label: 'Contact us',
    external: true,
  },
];

function slugify(s: string) {
  return s.replace(/\s+/g, '-').toLowerCase();
}

function FooterNav({
  title,
  icon: Icon,
  links,
}: {
  title: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  links: FooterLink[];
}) {
  const headingId = `footer-heading-${slugify(title)}`;
  return (
    <nav className="min-w-0 space-y-4" aria-labelledby={headingId}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h2 id={headingId} className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <ul className="space-y-2.5">
        {links.map((item) => (
          <li key={`${title}-${item.href}-${item.label}`}>
            {item.external ? (
              <a
                href={item.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="shrink-0 border-t border-border bg-linear-to-b from-muted/25 via-background to-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12">
          {/* Brand */}
          <div className="space-y-5 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-90">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white">
                A
              </span>
              <span className="text-xl font-bold tracking-tight text-foreground">AweTravel</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A digital transport marketplace connecting passengers with verified operators. Search routes,
              compare fares, and book with confidence. Prices on the platform are shown in{' '}
              <span className="font-medium text-foreground">{APP_CURRENCY_CODE}</span>.
            </p>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-border/80 bg-card px-3 py-2 transition-colors hover:border-accent/40 hover:text-foreground"
              >
                <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{SUPPORT_EMAIL}</span>
              </a>
              <p className="inline-flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>Serving travelers and operators across Uganda and the region.</span>
              </p>
            </div>
          </div>

          {/* Nav columns */}
          <div className="grid gap-10 sm:col-span-2 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
            <FooterNav title="For passengers" icon={Ticket} links={passengerLinks} />
            <FooterNav title="For operators" icon={Bus} links={operatorLinks} />
            <FooterNav title="Company" icon={Building2} links={companyLinks} />
          </div>
        </div>

        <Separator className="my-10 bg-border/70" />

        {/* Trust strip */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              <span>Secure sign-in &amp; verified operator profiles</span>
            </span>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>Transparent pricing · digital tickets</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right">
            Need help?{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Help%20with%20AweTravel`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Email support
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            &copy; {year} AweTravel. All rights reserved.
          </p>
          <p className="max-w-md sm:text-right">
            AweTravel is a marketplace platform. Operators are responsible for their services, schedules, and
            compliance with local transport regulations.
          </p>
        </div>
      </div>
    </footer>
  );
}
