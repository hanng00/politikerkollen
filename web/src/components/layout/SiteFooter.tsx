import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-medium text-sm mb-3">Löften</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/politiker" className="hover:text-foreground">Politiker</Link></li>
              <li><Link href="/loften" className="hover:text-foreground">Alla löften</Link></li>
              <li><Link href="/om/metodik" className="hover:text-foreground">Metodik</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-3">Intelligence</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/rapporter" className="hover:text-foreground">Rapporter</Link></li>
              <li><a href="tel:+46763281170" className="hover:text-foreground">Kontakt</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-3">Om</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/manifesto" className="hover:text-foreground">Manifest</Link></li>
              <li>
                <a
                  href="https://data.riksdagen.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Riksdagens data
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-3">Kontakt</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="tel:+46763281170" className="hover:text-foreground">076-328 11 70</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-muted-foreground border-t pt-6">
          <p className="text-sm">Politikerkollen — Verktyg för demokratisk transparens och politisk intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
