import Anthropic from "@anthropic-ai/sdk";

// 관리 화면 「Ai 번역 초안」. 초안은 칸에 채워질 뿐, 저장은 사람이 누른다.
// 키(ANTHROPIC_API_KEY)가 없으면 버튼 자체를 숨긴다 — translationAvailable().

export const TRANSLATE_MODEL = "claude-haiku-5-5";

/** 테스트에서 바꿔 끼울 수 있게 필요한 모양만 정의 */
export interface MessagesClient {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
    }): Promise<{ content: { type: string; text?: string }[] }>;
  };
}

const SYSTEM = [
  "You translate Korean text about places, menus and activities in Yangyang (Gangwon, Korea) into natural, friendly English for foreign visitors.",
  "Keep proper nouns (shop names, beach names, place names, dish names without a common English name) romanized in Revised Romanization, adding a short English explanation only when it helps (e.g. 'Makguksu (buckwheat noodles)').",
  "Do not invent facts. Keep numbers, times and prices as they are. Keep it concise.",
  "You receive a JSON object of Korean strings. Reply with ONLY a JSON object with exactly the same keys and the English strings as values — no commentary, no code fences.",
].join(" ");

export function translationAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function defaultClient(): MessagesClient {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 없습니다");
  return new Anthropic({ apiKey }) as unknown as MessagesClient;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("번역 응답이 JSON 이 아닙니다");
  const v: unknown = JSON.parse(text.slice(start, end + 1));
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("번역 응답이 JSON 객체가 아닙니다");
  return v as Record<string, unknown>;
}

export async function draftEnglish(
  fields: Record<string, string>,
  opts: { client?: MessagesClient } = {},
): Promise<Record<string, string>> {
  const input: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string" && v.trim()) input[k] = v.trim().slice(0, 4000);
  }
  if (Object.keys(input).length === 0) return {};

  const client = opts.client ?? defaultClient();
  const res = await client.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  const text = res.content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
  const parsed = parseJsonObject(text);

  const out: Record<string, string> = {};
  for (const k of Object.keys(input)) {
    const v = parsed[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}
