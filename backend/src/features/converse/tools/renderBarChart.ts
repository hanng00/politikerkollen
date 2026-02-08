import { z } from 'zod';

export const renderBarChartTool = {
  description: `Bar chart for comparing values across categories.

{
  "title": "Testledamot 2 har högst frånvaro",
  "data": [{"namn": "A", "antal": 100}, {"namn": "B", "antal": 200}],
  "labelColumn": "namn",
  "valueColumn": "antal"
}

Optional: description, color (#hex), horizontal (true/false).`,

  inputSchema: z.object({
    title: z.string().describe('Headline with main insight'),
    description: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())).min(1),
    labelColumn: z.string().describe('Column for bar labels'),
    valueColumn: z.string().describe('Column for numeric values'),
    color: z.string().optional().describe('Bar color (#hex)'),
    horizontal: z.boolean().optional(),
  }),

  execute: async (input: unknown) => {
    const schema = z.object({
      title: z.string(),
      description: z.string().optional(),
      data: z.array(z.record(z.string(), z.unknown())).min(1),
      labelColumn: z.string(),
      valueColumn: z.string(),
      color: z.string().optional(),
      horizontal: z.boolean().optional(),
    });

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        error: true,
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      };
    }

    const { data, labelColumn, valueColumn, color } = parsed.data;
    const cols = Object.keys(data[0] || {});

    if (!cols.includes(labelColumn)) {
      return { error: true, message: `labelColumn "${labelColumn}" not found`, hint: cols.join(', ') };
    }
    if (!cols.includes(valueColumn)) {
      return { error: true, message: `valueColumn "${valueColumn}" not found`, hint: cols.join(', ') };
    }

    // Transform to chart format: [{label, value}, ...]
    const bars: Array<{ label: string; value: number }> = [];

    for (const row of data) {
      const label = String(row[labelColumn] ?? '').trim();
      if (!label) continue;

      const raw = row[valueColumn];
      let value: number;

      if (typeof raw === 'number') {
        value = raw;
      } else if (typeof raw === 'string') {
        value = parseFloat(raw);
        if (isNaN(value)) {
          return { error: true, message: `Non-numeric value: "${raw}"` };
        }
      } else {
        return { error: true, message: `Invalid type in ${valueColumn}: ${typeof raw}` };
      }

      bars.push({ label, value });
    }

    if (bars.length === 0) {
      return { error: true, message: 'No valid data rows' };
    }

    return {
      type: 'bar_chart',
      title: parsed.data.title,
      description: parsed.data.description,
      data: bars,
      series: [{ key: 'value', label: valueColumn, color: color || '#3b82f6' }],
      horizontal: parsed.data.horizontal,
    };
  },
};
