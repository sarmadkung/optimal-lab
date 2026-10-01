// An MCP server lists tools. The app forwards the model's choice and returns the result.
// The model never opens the tool itself.

export type McpTool = { name: string; blurb: string };

export const TOOLS: McpTool[] = [
  { name: "get_weather", blurb: "Current temperature for a city" },
  { name: "search_docs", blurb: "Find a page in the docs" },
];

export type McpAsk = {
  id: string;
  question: string;
  tool: string;
  args: string;
  result: string;
};

export const ASKS: McpAsk[] = [
  {
    id: "weather",
    question: "How warm is it in Lahore?",
    tool: "get_weather",
    args: '{ "city": "Lahore" }',
    result: "34°C, dry (sample reading)",
  },
  {
    id: "docs",
    question: "Where do we document refunds?",
    tool: "search_docs",
    args: '{ "query": "refunds" }',
    result: "docs/billing/refunds",
  },
];
