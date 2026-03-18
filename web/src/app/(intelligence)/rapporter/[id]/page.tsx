import { notFound } from "next/navigation";
import { getReportById, reports } from "../data";
import ReportClient from "./ReportClient";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return reports.map((report) => ({
    id: report.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = getReportById(id);

  if (!report) {
    return { title: "Rapport" };
  }

  return {
    title: report.title,
    description: report.summary,
    openGraph: {
      title: report.title,
      description: report.summary,
      type: "article",
      siteName: "Politikerkollen",
    },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = getReportById(id);

  if (!report) {
    notFound();
  }

  return <ReportClient report={report} />;
}
