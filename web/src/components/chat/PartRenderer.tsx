"use client";

import { ToolInvocation } from "./ToolInvocation";
import { ReasoningBlock } from "./ReasoningBlock";
import { StepSeparator } from "./StepSeparator";
import { ChartRenderer } from "./ChartRenderer";
import { PoliticianCardRenderer } from "./PoliticianCardRenderer";
import { MessageResponse } from "@/components/ai-elements/message";

// Tools that render charts
const CHART_TOOLS = ["render_pie_chart", "render_bar_chart"] as const;
type ChartToolName = typeof CHART_TOOLS[number];

function isChartTool(toolName: string): toolName is ChartToolName {
  return CHART_TOOLS.includes(toolName as ChartToolName);
}

function getChartType(toolName: ChartToolName): "pie_chart" | "bar_chart" {
  switch (toolName) {
    case "render_pie_chart":
      return "pie_chart";
    case "render_bar_chart":
      return "bar_chart";
  }
}

// Part types from the AI SDK
interface BasePart {
  type: string;
}

interface TextPart extends BasePart {
  type: "text";
  text: string;
}

interface ReasoningPart extends BasePart {
  type: "reasoning";
  text?: string;
}

interface StepStartPart extends BasePart {
  type: "step-start";
  stepIndex?: number;
}

interface DynamicToolPart extends BasePart {
  type: "dynamic-tool";
  toolCallId: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
  errorText?: string;
}

interface ToolPart extends BasePart {
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
}

type MessagePart = TextPart | ReasoningPart | StepStartPart | DynamicToolPart | ToolPart;

interface PartRendererProps {
  part: MessagePart;
  index: number;
  role: "user" | "assistant" | "system";
}

export function PartRenderer({ part, index, role }: PartRendererProps) {
  const messageRole = role === "system" ? "assistant" : role;

  switch (part.type) {
    case "text":
      return messageRole === "assistant" ? (
        <MessageResponse key={index}>{(part as TextPart).text}</MessageResponse>
      ) : (
        <span key={index}>{(part as TextPart).text}</span>
      );

    case "reasoning":
      return <ReasoningBlock key={index} text={(part as ReasoningPart).text || ""} />;

    case "step-start": {
      const stepPart = part as StepStartPart;
      return (
        <StepSeparator
          key={index}
          stepIndex={typeof stepPart.stepIndex === "number" ? stepPart.stepIndex : 0}
        />
      );
    }

    case "dynamic-tool": {
      const toolPart = part as DynamicToolPart;
      return (
        <ToolInvocation
          key={toolPart.toolCallId}
          toolName={toolPart.toolName || ""}
          input={toolPart.input}
          output={toolPart.output}
          state={toolPart.state || ""}
          errorText={toolPart.state === "output-error" ? toolPart.errorText : undefined}
        />
      );
    }

      default:
        // Handle tool-{toolName} pattern (e.g., "tool-fetch_riksdag_document")
        if (part.type.startsWith("tool-")) {
          const toolName = part.type.replace("tool-", "");
          const toolPart = part as ToolPart;
          
          // Route chart tools to ChartRenderer
          if (isChartTool(toolName)) {
            return (
              <ChartRenderer
                key={toolPart.toolCallId || `chart-${index}`}
                chartType={getChartType(toolName)}
                input={toolPart.input}
                output={toolPart.output}
                state={toolPart.state || ""}
              />
            );
          }
          
          // Route politician card tool to PoliticianCardRenderer
          if (toolName === "render_politician_card") {
            return (
              <PoliticianCardRenderer
                key={toolPart.toolCallId || `politician-card-${index}`}
                input={toolPart.input}
                output={toolPart.output}
                state={toolPart.state || ""}
              />
            );
          }
          
          // All other tools go to ToolInvocation
          return (
            <ToolInvocation
              key={toolPart.toolCallId || `tool-${index}`}
              toolName={toolName}
              input={toolPart.input}
              output={toolPart.output}
              state={toolPart.state || ""}
              errorText={toolPart.state === "error" ? String(toolPart.output) : undefined}
            />
          );
        }
        return null;
  }
}
