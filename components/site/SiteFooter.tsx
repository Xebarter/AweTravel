import Link from 'next/link';
import { AppLogoMark } from '@/components/site/AppLogoMark';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { APP_CURRENCY_CODE } from '@/lib/currency';

const SUPPORT_EMAIL = 'support@awetravel.com';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const travelerLinks: FooterLink[] = [
  { href: '/signup', label: 'Get started' },
  { href: '/login', label: 'Sign in' },
  { href: '/', label: 'About the marketplace' },
];

const operatorLinks: FooterLink[] = [
  { href: '/signup', label: 'Register as a transporter' },
  { href: '/login', label: 'Transporter sign in' },
  {
    href: `mailto:${SUPPORT_EMAIL}?subject=Operator%20inquiry`,
    label: 'Partner with AweTravel',
    external: true,
  },
];

const platformLinks: FooterLink[] = [
  { href: '/', label: 'Home' },
  { href: '/terms', label: 'Terms of use' },
  { href: '/privacy', label: 'Privacy policy' },
  {
    href: `mailto:${SUPPORT_EMAIL}?subject=AweTravel%20support`,
    label: 'Email support',
    external: true,
  },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const headingId = `footer-col-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <nav className="min-w-0" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {links.map((item) => (
          <li key={`${title}-${item.label}`}>
            {item.external ? (
              <a
                href={item.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      className="shrink-0 border-t border-border/80 bg-muted/20 dark:bg-muted/10"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-5 lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <AppLogoMark size={40} className="h-10 w-10 rounded-lg bg-accent/10 ring-1 ring-border/60" />
              <span className="text-xl font-bold tracking-tight text-foreground">AweTravel</span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              A transport marketplace that connects passengers with verified operators. Search routes, compare
              fares, and manage bookings in one place. Prices are shown in{' '}
              <span className="font-medium text-foreground">{APP_CURRENCY_CODE}</span>.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
              <p className="inline-flex max-w-md items-start gap-2 text-sm text-muted-foreground sm:max-w-xs">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Serving travelers and operators across Uganda and the region.</span>
              </p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
            <FooterColumn title="Travelers" links={travelerLinks} />
            <FooterColumn title="Operators" links={operatorLinks} />
            <FooterColumn title="Platform" links={platformLinks} />
          </div>
        </div>

        <Separator className="my-10 bg-border/60" />

        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/80 px-4 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:bg-card/40">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>Secure authentication &amp; verified operator profiles</span>
            </span>
            <span className="hidden text-border sm:inline" aria-hidden>
              |
            </span>
            <span>Transparent pricing and digital trip records</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right">
            Questions?{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Help%20with%20AweTravel`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-border/60 pt-8 lg:flex-row lg:items-start lg:justify-between">
          <p className="text-xs text-muted-foreground">&copy; {year} AweTravel. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href="/terms"
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Privacy
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              support@awetravel.com
            </a>
          </nav>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground lg:max-w-md lg:text-right">
            AweTravel is a marketplace. Operators are responsible for their services, schedules, vehicles, and
            compliance with applicable transport and safety regulations.
          </p>
        </div>
      </div>
    </footer>
  );
}
