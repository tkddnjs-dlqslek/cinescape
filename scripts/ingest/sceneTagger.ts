import type Anthropic from "@anthropic-ai/sdk";
import type { RawLocation, TaggedScene, SceneTagger } from "./types";

export function buildTagPrompt(filmTitle: string, loc: RawLocation): string {
  return [
    `영화 "${filmTitle}"의 촬영지 "${loc.name}" (위도 ${loc.lat}, 경도 ${loc.lng})에 대해,`,
    `시네필 여행자를 위한 한국어 장면 설명(note)을 1~2문장으로 작성하세요.`,
    `규칙:`,
    `- 확실한 사실만 쓰세요. 확신이 없으면 지어내지 말고, 그 장소의 실제 모습과 분위기 중심으로 담백하게 묘사하세요.`,
    `- 등장인물 이름이나 구체적 줄거리가 확실하지 않으면 이름을 쓰지 말고 "이 장소" 같은 표현으로 대신하세요.`,
    `- 여행자가 현장에서 떠올릴 만한 장면·감정을 우아하게, 과장 없이.`,
    `반드시 아래 JSON 객체 하나만 출력하세요(코드펜스·설명 등 다른 텍스트 금지):`,
    `{"note": "한국어 장면 설명", "bearing": 카메라가 향한 대략 방위각 0-360 정수(모르면 0)}`,
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
        model: "claude-sonnet-4-6",
        max_tokens: 400,
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
