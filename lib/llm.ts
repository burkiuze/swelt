// Shared (client + server) list of agent LLMs. `ultra: true` models need the Ultra plan.
export const LLMS = [
  { key: "glm", label: "GLM 5.3 Flash", vendor: "Z.ai", default: true, ultra: false },
  { key: "deepseek", label: "DeepSeek V4.1 Flash", vendor: "DeepSeek", default: false, ultra: false },
  { key: "opus", label: "Opus 5.5", vendor: "Anthropic", default: false, ultra: true },
  { key: "sol", label: "GPT-6.1 Sol", vendor: "OpenAI", default: false, ultra: true },
] as const;

export type LlmKey = (typeof LLMS)[number]["key"];
export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];
export const llmLabel = (k: LlmKey) => LLMS.find((l) => l.key === k)?.label ?? k;
