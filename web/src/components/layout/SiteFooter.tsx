export function SiteFooter() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="page-container text-center text-muted-foreground">
        <p className="text-sm">Ett verktyg för demokratiskt ansvarsutkrävande.</p>
        <p className="text-sm mt-1">
          Data från{" "}
          <a
            href="https://data.riksdagen.se"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Riksdagens öppna data
          </a>
        </p>
      </div>
    </footer>
  );
}
