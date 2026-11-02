import { describe, expect, it, vi } from "vitest";
import { draftEnglish, TRANSLATE_MODEL, type MessagesClient } from "../src/lib/translate";

function stub(text: string) {
  const create = vi.fn(async (args: unknown) => {
    void args;
    return { content: [{ type: "text", text }] };
  });
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

describe("draftEnglish", () => {
  it("sends Korean fields to claude-haiku-5-5 and returns English with the same keys", async () => {
    const { client, create } = stub('{"name":"Sample Noodle House","summary":"Buckwheat noodles"}');
    const out = await draftEnglish({ name: "샘플 막국수집", summary: "메밀 막국수" }, { client });
    expect(out).toEqual({ name: "Sample Noodle House", summary: "Buckwheat noodles" });
    expect(TRANSLATE_MODEL).toBe("claude-haiku-5-5");
    const args = create.mock.calls[0][0] as { model: string; system: string; messages: { content: string }[] };
    expect(args.model).toBe("claude-haiku-5-5");
    expect(args.system).toMatch(/foreign visitors/i);
    expect(args.system).toMatch(/romaniz/i);
    expect(args.messages[0].content).toContain("샘플 막국수집");
  });

  it("tolerates code fences and drops unknown / non-string keys", async () => {
    const { client } = stub('```json\n{"name":"Noodle","extra":"x","summary":3}\n```');
    expect(await draftEnglish({ name: "국수", summary: "설명" }, { client })).toEqual({ name: "Noodle" });
  });

  it("skips empty fields without calling the model", async () => {
    const { client, create } = stub("{}");
    expect(await draftEnglish({ name: "  " }, { client })).toEqual({});
    expect(create).not.toHaveBeenCalled();
  });

  it("throws on a reply that is not JSON", async () => {
    const { client } = stub("Sorry, I can't");
    await expect(draftEnglish({ name: "국수" }, { client })).rejects.toThrow();
  });
});
