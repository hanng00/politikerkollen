import { SiteHeader } from "@/components/layout";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="page-container-narrow py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted">
          <SearchX className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl">Motsägelse hittades inte</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Den motsägelse du letar efter finns inte eller har tagits bort. 
          Kanske den har rättats till?
        </p>
        <Link href="/" className={buttonVariants()}>
          <ArrowLeft className="size-4 mr-2" />
          Till startsidan
        </Link>
      </main>
    </div>
  );
}
