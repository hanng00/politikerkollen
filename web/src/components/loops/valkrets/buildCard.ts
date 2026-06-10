import type { ShareCardData, ShareCardLine } from "@/components/share";
import type { Constituency } from "@/types";
import { gradeAccentHex } from "@/lib/grades";

import type { PartyGrade } from "./useLocalScorecard";

function statusForGrade(grade: PartyGrade["grade"]): ShareCardLine["status"] {
  if (grade === "A" || grade === "B") return "kept";
  if (grade === "F") return "broke";
  return "mixed";
}

export function buildValkretsCard(
  constituency: Constituency,
  grades: PartyGrade[],
): ShareCardData {
  const top = grades[0];
  return {
    kind: "grade",
    accent: top ? gradeAccentHex(top.grade) : "#6366f1",
    eyebrow: "Min valkrets",
    title: constituency.name,
    subtitle: "Så väl har partierna hållit sina vallöften sedan 2022.",
    lines: grades.slice(0, 6).map((g) => ({
      label: `${g.name}`,
      status: statusForGrade(g.grade),
      detail: `Betyg ${g.grade}`,
    })),
    source: "Riksdagens öppna data via Politikerkollen",
    footnote: "Betyg på partinivå — kandidatbetyg kommer.",
  };
}
