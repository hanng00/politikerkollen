"use client";

import { useState } from "react";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
} from "@/components/ai-elements/artifact";
import { 
  ExternalLinkIcon, 
  FileTextIcon, 
  DownloadIcon, 
  FileIcon,
  TextIcon,
  Loader2Icon,
  AlertCircleIcon,
  MaximizeIcon,
} from "lucide-react";
import { useRiksdagDocument } from "@/hooks/useRiksdagDocument";

export interface RiksdagDocumentData {
  dokId: string;
  title?: string;
  type?: string;
  subtype?: string;
  date?: string;
  content?: string;
  htmlUrl?: string;
  pdfUrl?: string;
}

interface RiksdagDocumentProps {
  /** Either pass a dokId to fetch, or pre-fetched document data */
  dokId?: string;
  document?: RiksdagDocumentData;
}

type ViewMode = "pdf" | "text";

export function RiksdagDocument({ dokId, document: initialData }: RiksdagDocumentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use TanStack Query to fetch document metadata if only dokId is provided
  const { data: fetchedData, isLoading, error } = useRiksdagDocument(
    initialData ? undefined : dokId
  );
  
  // Use initial data if provided, otherwise use fetched data
  const document = initialData || fetchedData;
  
  // Construct PDF URL from dokId
  const pdfUrl = document?.pdfUrl || (dokId ? `https://data.riksdagen.se/dokument/${dokId}.pdf` : undefined);

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = window.document.createElement("a");
      link.href = pdfUrl;
      link.download = `${document?.dokId || dokId}.pdf`;
      link.click();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Loading state - but we can still show PDF iframe while metadata loads
  if (isLoading && !pdfUrl) {
    return (
      <Artifact className="max-w-full">
        <ArtifactHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary/10">
              <Loader2Icon className="size-4 text-primary animate-spin" />
            </div>
            <div>
              <ArtifactTitle>Hämtar dokument...</ArtifactTitle>
              <ArtifactDescription className="font-mono">{dokId}</ArtifactDescription>
            </div>
          </div>
        </ArtifactHeader>
      </Artifact>
    );
  }

  // Error state
  if (error && !pdfUrl) {
    return (
      <Artifact className="max-w-full border-destructive/50">
        <ArtifactHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-md bg-destructive/10">
              <AlertCircleIcon className="size-4 text-destructive" />
            </div>
            <div>
              <ArtifactTitle>Kunde inte hämta dokument</ArtifactTitle>
              <ArtifactDescription className="font-mono">{dokId}</ArtifactDescription>
            </div>
          </div>
        </ArtifactHeader>
      </Artifact>
    );
  }

  const containerClass = isFullscreen 
    ? "fixed inset-4 z-50 flex flex-col bg-background border rounded-lg shadow-2xl" 
    : "w-full max-w-full min-w-0";

  return (
    <>
      {/* Backdrop for fullscreen */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
          onClick={toggleFullscreen}
        />
      )}
      
      <Artifact className={containerClass}>
        <ArtifactHeader>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 shrink-0">
              <FileTextIcon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <ArtifactTitle className="truncate">
                {document?.title || document?.dokId || dokId}
              </ArtifactTitle>
              <ArtifactDescription className="flex items-center gap-2 mt-0.5 flex-wrap">
                {document?.type && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {document.type}
                  </span>
                )}
                {document?.subtype && document.subtype !== document.type && (
                  <span className="text-muted-foreground/70">{document.subtype}</span>
                )}
                {document?.date && (
                  <span className="text-muted-foreground/70">{document.date.split(" ")[0]}</span>
                )}
                <span className="font-mono text-muted-foreground/50">{document?.dokId || dokId}</span>
              </ArtifactDescription>
            </div>
          </div>
          <ArtifactActions>
            {/* View mode toggle */}
            {document?.content && (
              <ArtifactAction
                tooltip={viewMode === "pdf" ? "Visa text" : "Visa PDF"}
                icon={viewMode === "pdf" ? TextIcon : FileIcon}
                onClick={() => setViewMode(viewMode === "pdf" ? "text" : "pdf")}
              />
            )}
            <ArtifactAction
              tooltip={isFullscreen ? "Minimera" : "Fullskärm"}
              icon={MaximizeIcon}
              onClick={toggleFullscreen}
            />
            <ArtifactAction
              tooltip="Ladda ner PDF"
              icon={DownloadIcon}
              onClick={handleDownload}
            />
            <ArtifactAction
              tooltip="Öppna i ny flik"
              icon={ExternalLinkIcon}
              onClick={handleOpenExternal}
            />
          </ArtifactActions>
        </ArtifactHeader>
        
        {/* PDF View */}
        {viewMode === "pdf" && pdfUrl && (
          <div className={isFullscreen ? "flex-1 min-h-0" : "h-[500px] min-h-0"}>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 min-w-0"
              title={document?.title || `Dokument ${dokId}`}
            />
          </div>
        )}
        
        {/* Text View */}
        {viewMode === "text" && document?.content && (
          <div className={`overflow-y-auto bg-muted/30 p-4 min-w-0 ${isFullscreen ? "flex-1 min-h-0" : "max-h-[500px]"}`}>
            <article className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">
                {document.content}
              </div>
            </article>
          </div>
        )}
      </Artifact>
    </>
  );
}
