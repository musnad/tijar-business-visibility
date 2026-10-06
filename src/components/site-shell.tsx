import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "How It Works", to: "/how-it-works" as const },
  { label: "Learn", to: "/learn" as const },
  { label: "Business Visibility", to: "/business-visibility" as const },
  { label: "About", to: "/about" as const },
];

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" aria-label="TIJAR home" className="inline-flex items-center gap-2.5">
      <span className={`relative grid size-8 place-items-center rounded-full ${inverse ? "bg-foreground text-background" : "bg-primary text-primary-foreground"}`}>
        <span className="size-2.5 rounded-full border-2 border-current" />
        <span className="absolute -right-0.5 top-0.5 size-2.5 rounded-full bg-secondary" />
      </span>
      <span className="text-xl font-extrabold tracking-[0.12em] text-foreground">TIJAR</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:p-3">Skip to content</a>
      <div className="mx-auto grid h-20 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center px-5 lg:px-6">
        <BrandMark />
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {links.map((link) => <Link key={link.to} to={link.to} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{link.label}</Link>)}
          <Button variant="ghost" className="h-11 px-3" title="Sign in is coming soon">Sign In</Button>
          <Button asChild size="lg"><Link to="/get-started">Get Started</Link></Button>
        </nav>
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-border bg-background px-5 py-5 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((link) => <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-semibold hover:">{link.label}</Link>)}
            <Link to="/contact" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-semibold hover:">Contact</Link>
            <Button asChild size="lg" className="mt-3 "><Link to="/get-started" onClick={() => setOpen(false)}>Get Started</Link></Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-6">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div><BrandMark inverse /><p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">Making Every Business Visible.</p><p className="mt-2 text-sm font-semibold text-primary">Learn. Run. Grow.</p></div>
          <div><h2 className="text-xs font-extrabold uppercase tracking-[0.14em]">Product</h2><div className="mt-5 grid gap-3 text-sm text-muted-foreground"><Link to="/how-it-works">How It Works</Link><Link to="/learn">Learn</Link><Link to="/business-visibility">Business Visibility</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></div></div>
          <div><h2 className="text-xs font-extrabold uppercase tracking-[0.14em]">Legal</h2><div className="mt-5 grid gap-3 text-sm text-muted-foreground"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><div className="mt-6 flex gap-2" aria-label="Social channels"><Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Instagram, coming soon" title="Coming soon"><Instagram /></Button><Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="LinkedIn, coming soon" title="Coming soon"><Linkedin /></Button></div></div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">© 2026 TIJAR. All rights reserved.</div>
      </div>
    </footer>
  );
}