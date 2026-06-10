import { notFound } from "next/navigation";

import { LabExperimentClient } from "@/components/loops/LabExperimentClient";
import { EXPERIMENT_LIST } from "@/lib/experiments";
import { isExperimentKey } from "@/lib/experiments";

export function generateStaticParams() {
  return EXPERIMENT_LIST.map((e) => ({ experiment: e.key }));
}

export default async function LabExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isExperimentKey(experiment)) notFound();

  return <LabExperimentClient experiment={experiment} />;
}
