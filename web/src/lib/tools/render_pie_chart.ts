import { z } from "zod";

export const renderPieChartTool = {
  description: `Creates a clean, labelled pie chart optimised for telling a clear story — in the spirit of The Economist.

IMPORTANT: The chart is fully rendered in the UI with title, description, labels, values, and percentages. DO NOT repeat the raw numbers or list the data in your text response. Instead, add value by interpreting the data, highlighting key insights, or offering follow-up analysis.

Ideal for showing composition, voting results, yes/no splits, categorical distributions or "how the votes/reactions/choices broke down".

The title should make a strong, interesting statement — not just describe the chart. Think headline, not caption.

Example format:

{
  "title": "A clear majority backed the proposal",
  "description": "Votes in the Riksdag finance committee, 2025",
  "data": [
    {"rost": "Ja",      "antal": 414},
    {"rost": "Nej",      "antal": 50},
    {"rost": "Frånvarande", "antal": 180},
    {"rost": "Avstod",   "antal": 12}
  ],
  "labelColumn": "rost",
  "valueColumn": "antal",
  "colors": {
    "Ja": "#22c55e",
    "Nej": "#ef4444",
    "Frånvarande": "#cbd5e1",
    "Avstod": "#f97316"
  }
}

Default colour logic (when colors object is omitted):
• "Ja / Yes / Förslag / Bifaller" → green   (#22c55e)
• "Nej / No / Avslag / Avslår"    → red     (#ef4444)
• "Avstår / Abstain / Avstod"     → orange  (#f97316)
• "Frånvarande / Absent"          → light gray (#cbd5e1)
• everything else                 → muted blue-gray (#94a3b8)`,

  inputSchema: z.object({
    title: z
      .string()
      .min(8)
      .max(90)
      .describe(
        "Chart headline. Should be a short, confident statement that conveys the main message or surprise in the data. Avoid neutral descriptions like 'Distribution of votes'."
      ),

    description: z
      .string()
      .max(140)
      .optional()
      .describe(
        "Optional subtitle / source line. Keep it factual and concise — e.g. 'Votes in EU committee on AI regulation, March 2025' or 'n = 832 respondents, Nov–Dec 2025'."
      ),

    data: z
      .array(z.record(z.string(), z.unknown()))
      .min(2)
      .max(12) // pies with >10–12 slices become very hard to read
      .describe(
        "Array of objects (usually the direct result of a SQL query). Must contain at least two rows."
      ),

    labelColumn: z
      .string()
      .min(1)
      .describe(
        "Name of the column that contains the category names/labels (e.g. 'rost', 'party', 'answer', 'category')"
      ),

    valueColumn: z
      .string()
      .min(1)
      .describe(
        "Name of the column that contains the numeric values to visualise (must be non-negative numbers)"
      ),

    colors: z
      .record(z.string(), z.string().regex(/^#([0-9a-fA-F]{6})$/))
      .optional()
      .describe(
        "Optional explicit colour mapping: { 'Ja': '#22c55e', 'Nej': '#ef4444' }. " +
        "Keys must exactly match the values in labelColumn. " +
        "Use hex colors only (#rrggbb). " +
        "If omitted, intelligent defaults are applied for common yes/no/absent patterns."
      ),
  }),

  execute: async (input: unknown) => {
    const schema = z.object({
      title: z.string().min(8).max(90),
      description: z.string().max(140).optional(),
      data: z.array(z.record(z.string(), z.unknown())).min(2).max(12),
      labelColumn: z.string().min(1),
      valueColumn: z.string().min(1),
      colors: z.record(z.string(), z.string().regex(/^#([0-9a-fA-F]{6})$/)).optional(),
    });

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        error: true,
        message: "Invalid input:\n" + parsed.error.issues
          .map(i => `  • ${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      };
    }

    const { data, labelColumn, valueColumn, colors } = parsed.data;

    // Column existence check
    const first = data[0] ?? {};
    const cols = Object.keys(first);

    if (!cols.includes(labelColumn)) {
      return {
        error: true,
        message: `Column "${labelColumn}" not found in data`,
        availableColumns: cols,
      };
    }

    if (!cols.includes(valueColumn)) {
      return {
        error: true,
        message: `Column "${valueColumn}" not found in data`,
        availableColumns: cols,
      };
    }

    // Transform + validation
    const slices: Array<{ label: string; value: number; color?: string }> = [];

    for (const row of data) {
      const label = String(row[labelColumn] ?? "").trim();
      if (!label) continue; // skip empty labels

      const raw = row[valueColumn];
      let value: number;

      if (typeof raw === "number") {
        value = raw;
      } else if (typeof raw === "string") {
        value = Number.parseFloat(raw);
        if (Number.isNaN(value)) {
          return { error: true, message: `Non-numeric value in ${valueColumn}: "${raw}"` };
        }
      } else {
        return { error: true, message: `Bad type in ${valueColumn}: ${typeof raw}` };
      }

      if (value < 0) {
        return { error: true, message: `Negative value not allowed in pie chart: "${label}" → ${value}` };
      }

      slices.push({
        label,
        value,
        color: colors?.[label],
      });
    }

    if (slices.length < 2) {
      return { error: true, message: "Not enough valid rows after cleaning (need ≥ 2)" };
    }

    // Optional: sort descending by value (very common in Economist-style pies)
    slices.sort((a, b) => b.value - a.value);

    return {
      type: "pie_chart",
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() ?? undefined,
      data: slices,
    };
  },
};