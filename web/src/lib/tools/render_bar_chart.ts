import { z } from "zod";
import { formatDateLabel } from "../utils/format_date_label";

export const renderBarChartTool = {
  description: `Creates a clean, labelled bar chart optimised for telling a clear story — in the spirit of The Economist.

IMPORTANT: The chart is fully rendered in the UI with title, description, bars, labels, and legend. DO NOT repeat the raw numbers or list the data in your text response. Instead, add value by interpreting patterns, highlighting surprises, or offering follow-up analysis.

Ideal for comparing values across categories: politician voting patterns, party comparisons, trends over time, or ranked lists.

The title should make a strong, interesting statement — not just describe the chart. Think headline, not caption.

Example format:

{
  "title": "Liberalerna röstar oftare ja än genomsnittet",
  "description": "Andel ja-röster per parti, 2024",
  "data": [
    {"namn": "Joar Forssell", "rost": "Ja", "antal": 468},
    {"namn": "Joar Forssell", "rost": "Frånvarande", "antal": 126},
    {"namn": "Helena Gellerman", "rost": "Ja", "antal": 495},
    {"namn": "Helena Gellerman", "rost": "Frånvarande", "antal": 99}
  ],
  "dimensions": ["namn"],
  "valueColumn": "antal",
  "categoryColumn": "rost",
  "series": [
    {"key": "Ja", "label": "Ja", "color": "#22c55e"},
    {"key": "Frånvarande", "label": "Frånvarande", "color": "#94a3b8"}
  ]
}

Rules:
- dimensions: columns to group by (combined into x-axis label)
- categoryColumn: values become the series/legend
- series.key must match categoryColumn values exactly`,

  inputSchema: z.object({
    title: z.string().describe("Title of the chart. Should contain the main conclusion from the data sparking interest."),
    description: z.string().optional().describe("Description of the chart. Should contain a short description of the data."),
    data: z.array(z.record(z.string(), z.unknown())).min(1).describe("Array of objects from SQL query results"),
    dimensions: z.array(z.string()).min(1).describe("Column names to group by (creates label)"),
    valueColumn: z.string().describe("Column name containing numeric values."),
    categoryColumn: z.string().describe("Column name whose values become series keys."),
    series: z
      .array(
        z.object({
          key: z.string().describe("Must match a value in categoryColumn"),
          label: z.string(),
          color: z.string().optional(),
        })
      )
      .min(1),
    stacked: z.boolean().optional(),
    horizontal: z.boolean().optional(),
  }),

  execute: async (input: unknown) => {
    try {
      const schema = z.object({
        title: z.string(),
        description: z.string().optional(),
        data: z.array(z.record(z.string(), z.unknown())).min(1),
        dimensions: z.array(z.string()).min(1),
        valueColumn: z.string(),
        categoryColumn: z.string(),
        series: z
          .array(z.object({ key: z.string(), label: z.string(), color: z.string().optional() }))
          .min(1),
        stacked: z.boolean().optional(),
        horizontal: z.boolean().optional(),
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

      const { data, dimensions, valueColumn, categoryColumn, series } = parsed.data;

      // Validate columns exist in data
      if (!data || data.length === 0) {
        return {
          error: true,
          message: "Data array is empty",
        };
      }

      const firstItem = data[0] || {};
      const availableColumns = Object.keys(firstItem);
      
      const missingDimensions = dimensions.filter((d) => !availableColumns.includes(d));
      if (missingDimensions.length > 0) {
        return {
          error: true,
          message: `Dimension columns not found: ${missingDimensions.join(", ")}`,
          hint: `Available columns: ${availableColumns.join(", ")}`,
        };
      }

      if (!availableColumns.includes(valueColumn)) {
        return {
          error: true,
          message: `Value column "${valueColumn}" not found in data`,
          hint: `Available columns: ${availableColumns.join(", ")}`,
        };
      }

      if (!availableColumns.includes(categoryColumn)) {
        return {
          error: true,
          message: `Category column "${categoryColumn}" not found in data`,
          hint: `Available columns: ${availableColumns.join(", ")}`,
        };
      }

      // Validate series keys exist in categoryColumn values
      const categoryValues = new Set(
        data.map((row) => String(row[categoryColumn] ?? "")).filter(Boolean)
      );
      const missingSeries = series.filter((s) => !categoryValues.has(s.key));
      if (missingSeries.length > 0) {
        return {
          error: true,
          message: `Series keys not found in ${categoryColumn}: ${missingSeries.map((m) => m.key).join(", ")}`,
          hint: `Available values: ${Array.from(categoryValues).slice(0, 10).join(", ")}${categoryValues.size > 10 ? "..." : ""}`,
        };
      }

      // Transform long format to wide format
      // Group by dimensions, pivot categoryColumn values into properties
      const grouped = new Map<string, Record<string, string | number>>();

      for (const row of data) {
        // Create label from dimensions, formatting date-like values
        const labelParts = dimensions.map((dim) => {
          const value = String(row[dim] ?? "");
          return formatDateLabel(value);
        }).filter(Boolean);
        const label = labelParts.join(" ");

        // Get category value and numeric value
        const category = String(row[categoryColumn] ?? "");
        const value = row[valueColumn];

        // Convert value to number
        let numValue: number;
        if (typeof value === "number") {
          numValue = value;
        } else if (typeof value === "string") {
          numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return {
              error: true,
              message: `Non-numeric value in ${valueColumn}: "${value}"`,
              hint: `Row: ${JSON.stringify(row)}`,
            };
          }
        } else {
          return {
            error: true,
            message: `Invalid value type in ${valueColumn}: ${typeof value}`,
            hint: `Row: ${JSON.stringify(row)}`,
          };
        }

        // Initialize group if needed
        if (!grouped.has(label)) {
          grouped.set(label, { label });
        }

        const group = grouped.get(label)!;
        
        // Accumulate values (in case of duplicates, sum them)
        const existingValue = typeof group[category] === "number" ? group[category] : 0;
        group[category] = existingValue + numValue;
      }

      // Convert to array format
      const transformedData = Array.from(grouped.values());

      if (transformedData.length === 0) {
        return {
          error: true,
          message: "No data after transformation",
        };
      }

      // Validate all series keys exist in transformed data
      const missingInTransformed = series.filter(
        (s) => !transformedData.some((d) => s.key in d && typeof d[s.key] === "number")
      );
      if (missingInTransformed.length > 0) {
        return {
          error: true,
          message: `Series keys not found in transformed data: ${missingInTransformed.map((m) => m.key).join(", ")}`,
          hint: "This might indicate a mismatch between series keys and categoryColumn values",
        };
      }

      return {
        type: "bar_chart",
        title: parsed.data.title,
        description: parsed.data.description,
        data: transformedData,
        series: parsed.data.series,
        stacked: parsed.data.stacked,
        horizontal: parsed.data.horizontal,
      };
    } catch (error) {
      return {
        error: true,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
