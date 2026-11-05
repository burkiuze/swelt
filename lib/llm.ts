// Shared (client + server) list of agent LLMs.
export const LLMS = [
  { key: "opus", label: "Opus 5.5", vendor: "Anthropic", default: true },
  { key: "sol", label: "GPT-6.1 Sol", vendor: "OpenAI", default: false },
] as const;

export type LlmKey = (typeof LLMS)[number]["key"];
export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];
