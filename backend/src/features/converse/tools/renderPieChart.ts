import { z } from 'zod';

export const renderPieChartTool = {
  description: `Pie chart for showing composition or distribution.

{
  "title": "A clear majority backed the proposal",
  "data": [{"rost": "Ja", "antal": 414}, {"rost": "Nej", "antal": 50}],
  "labelColumn": "rost",
  "valueColumn": "antal"
}

Optional: description, colors ({"Ja": "#22c55e"}). Auto-colors: Ja=green, Nej=red, Frånvarande=gray.`,

  inputSchema: z.object({
    title: z.string().describe('Headline with main insight'),
    description: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())).min(2).max(12),
    labelColumn: z.string().describe('Column for slice labels'),
    valueColumn: z.string().describe('Column for numeric values'),
    colors: z.record(z.string(), z.string().regex(/^#([0-9a-fA-F]{6})$/)).optional(),
  }),

  execute: async (input: unknown) => {
    const schema = z.object({
      title: z.string(),
      description: z.string().optional(),
      data: z.array(z.record(z.string(), z.unknown())).min(2).max(12),
      labelColumn: z.string(),
      valueColumn: z.string(),
      colors: z.record(z.string(), z.string().regex(/^#([0-9a-fA-F]{6})$/)).optional(),
    });

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        error: true,
        message: 'Invalid input:\n' + parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n'),
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
      const label = String(row[labelColumn] ?? '').trim();
      if (!label) continue; // skip empty labels

      const raw = row[valueColumn];
      let value: number;

      if (typeof raw === 'number') {
        value = raw;
      } else if (typeof raw === 'string') {
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
      return { error: true, message: 'Not enough valid rows after cleaning (need ≥ 2)' };
    }

    // Optional: sort descending by value (very common in Economist-style pies)
    slices.sort((a, b) => b.value - a.value);

    return {
      type: 'pie_chart',
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() ?? undefined,
      data: slices,
    };
  },
};
