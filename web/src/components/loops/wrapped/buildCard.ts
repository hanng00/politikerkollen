import type { ShareCardData } from "@/components/share";
import { getPartyColor } from "@/lib/parties";
import { gradeAccentHex, gradeWord } from "@/lib/grades";

import type { WrappedData } from "./types";

export function buildWrappedCard(data: WrappedData): ShareCardData {
  return {
    kind: "grade",
    accent: getPartyColor(data.party) || gradeAccentHex(data.grade),
    eyebrow: "Riksdagen Wrapped",
    title: data.subjectName,
    subtitle: `${data.stats.promisesKept} hållna och ${data.stats.promisesBroke} brutna löften sedan valet 2022.`,
    grade: data.grade,
    verdict: {
      label: gradeWord(data.grade),
      tone:
        data.grade === "A" || data.grade === "B"
          ? "positive"
          : data.grade === "F"
            ? "negative"
            : "warning",
    },
    source: data.source,
    footnote: "Aktivitetssiffror delvis uppskattade — se appen för källor.",
  };
}
