export type AiProviderId = "openai" | "anthropic" | "gemini";

export type AiModelOption = {
  id: string;
  label: string;
};

export type AiProviderConfig = {
  id: AiProviderId;
  name: string;
  envKey: string;
  models: AiModelOption[];
};

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "gpt-4.1-mini", label: "gpt-4.1-mini" }
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" }
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }
    ],
  },
];

export function getProviderById(id: AiProviderId): AiProviderConfig | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}
