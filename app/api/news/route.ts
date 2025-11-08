import { NextResponse } from "next/server";
import { buildNarrativeFromStory, sanitizeString } from "@/lib/story";

type HackerNewsStory = {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  created_at: string;
  author: string;
  story_text: string | null;
  comment_text: string | null;
  tags?: string[];
  _highlightResult?: {
    title?: { value: string };
  };
};

type EnrichedStory = ReturnType<typeof buildNarrativeFromStory>;

const HN_SOURCE = "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=20&query=AI%20tool";

export async function GET() {
  try {
    const response = await fetch(HN_SOURCE, { next: { revalidate: 300 } });
    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { hits: HackerNewsStory[] };
    const curated = payload.hits
      .filter((story) => story.title && story.title.toLowerCase().includes("ai"))
      .slice(0, 12)
      .map((story) => buildNarrativeFromStory(story));

    const deduped: Record<string, EnrichedStory> = {};
    curated.forEach((entry) => {
      const signature = sanitizeString(entry.title);
      if (!deduped[signature]) {
        deduped[signature] = entry;
      }
    });

    return NextResponse.json(Object.values(deduped));
  } catch (error) {
    console.error("[api/news] failed", error);
    return NextResponse.json({ error: "Failed to fetch AI tooling intelligence." }, { status: 500 });
  }
}
