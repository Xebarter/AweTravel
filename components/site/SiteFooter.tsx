import Link from 'next/link';
import { AppLogoMark } from '@/components/site/AppLogoMark';
import { Mail, Phone } from 'lucide-react';
import { APP_CURRENCY_CODE } from '@/lib/currency';

const SUPPORT_EMAIL = 'support@awetravel.com';

const SUPPORT_PHONE_DISPLAY = '+256 787 962827';
const SUPPORT_PHONE_E164 = '+256787962827';
const SUPPORT_WHATSAPP_URL = 'https://wa.me/256787962827';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const travelerLinks: FooterLink[] = [
  { href: '/signup', label: 'Sign up' },
  { href: '/login', label: 'Sign in' },
];

const operatorLinks: FooterLink[] = [
  { href: '/signup', label: 'Operator sign up' },
  { href: '/login', label: 'Operator sign in' },
  {
    href: `mailto:${SUPPORT_EMAIL}?subject=Partnership`,
    label: 'Partnerships',
    external: true,
  },
];

const platformLinks: FooterLink[] = [
  { href: '/', label: 'Home' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <AppLogoMark size={40} className="h-10 w-10 rounded-lg bg-accent/10 ring-1 ring-border/60" />
              <span className="text-xl font-bold tracking-tight text-foreground">AweTravel</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">
              Transport marketplace. Fares in <span className="font-medium text-foreground">{APP_CURRENCY_CODE}</span>.
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
              <a
                href={`tel:${SUPPORT_PHONE_E164}`}
                aria-label={`Call ${SUPPORT_PHONE_DISPLAY}`}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#20BD5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`WhatsApp ${SUPPORT_PHONE_DISPLAY}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterColumn title="Travelers" links={travelerLinks} />
            <FooterColumn title="Operators" links={operatorLinks} />
            <FooterColumn title="Platform" links={platformLinks} />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">&copy; {year} AweTravel</p>
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
          </nav>
          <p className="max-w-md text-xs text-muted-foreground sm:text-right">
            Operators are responsible for their services and compliance with applicable regulations.
          </p>
        </div>
      </div>
    </footer>
  );
}
