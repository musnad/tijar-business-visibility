/**
 * Server-only image design when Grok Imagine is unset or rejected.
 * Uses OPENAI_API_KEY. Never prefix with VITE_. Never log prompts or the key.
 */

import { readOpenAiConfig } from "@/lib/openai/client";

export async function openaiGenerateImage(prompt: string): Promise<{ dataUrl: string } | null> {
  const { apiKey, baseUrl } = readOpenAiConfig();
  if (!apiKey) return null;
  const attempts: Array<Record<string, unknown>> = [
    { model: "gpt-image-1-mini", prompt, size: "1024x1536", n: 1 },
    { model: "gpt-image-1", prompt, size: "1024x1536", n: 1 },
  ];
  for (const body of attempts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 180_000);
      const res = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const row = json.data?.[0];
      if (row?.b64_json) return { dataUrl: `data:image/png;base64,${row.b64_json}` };
      if (row?.url) {
        const img = await fetch(row.url);
        if (!img.ok) continue;
        const buf = Buffer.from(await img.arrayBuffer());
        return { dataUrl: `data:image/png;base64,${buf.toString("base64")}` };
      }
    } catch {
      continue;
    }
  }
  return null;
}
