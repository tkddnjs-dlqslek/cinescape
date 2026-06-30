import type Anthropic from "@anthropic-ai/sdk";
import type { RawLocation, TaggedScene, SceneTagger } from "./types";

export function buildTagPrompt(filmTitle: string, loc: RawLocation): string {
  return [
    `영화 "${filmTitle}"의 촬영지 "${loc.name}" (위도 ${loc.lat}, 경도 ${loc.lng})에 대해,`,
    `시네필 여행자를 위한 한국어 장면 설명을 작성하세요.`,
    `반드시 아래 JSON만 출력하세요(다른 텍스트 금지):`,
    `{"note": "이 장소에서 일어난 인상적인 장면 한 문장(한국어)", "bearing": 카메라가 향한 대략 방위각 0-360 정수(모르면 0)}`,
  ].join("\n");
}

export function parseTagResponse(text: string): TaggedScene {
  const m = text.match(/\{[\s\S]*\}/);
  let note = "";
  let bearing = 0;
  if (m) {
    try {
      const obj = JSON.parse(m[0]) as { note?: string; bearing?: number };
      note = typeof obj.note === "string" ? obj.note : "";
      const b = typeof obj.bearing === "number" ? obj.bearing : 0;
      bearing = b >= 0 && b <= 360 ? Math.round(b) : 0;
    } catch {
      /* fall through to defaults */
    }
  }
  return { name: "", note, bearing };
}

export function makeSceneTagger(client: Anthropic): SceneTagger {
  return {
    async tag(filmTitle: string, loc: RawLocation): Promise<TaggedScene> {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: buildTagPrompt(filmTitle, loc) }],
      });
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      const parsed = parseTagResponse(text);
      return { ...parsed, name: loc.name };
    },
  };
}
