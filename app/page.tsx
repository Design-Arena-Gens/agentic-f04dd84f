"use client";

import { useEffect, useMemo, useState } from "react";
import { NewsList, type Story } from "@/components/NewsList";
import { VideoComposer } from "@/components/VideoComposer";

type FetchState = "idle" | "loading" | "ready" | "error";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("idle");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setFetchState("loading");
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as Story[];
        if (!cancelled) {
          setStories(data);
          setSelectedStory(data[0] ?? null);
          setFetchState("ready");
        }
      } catch (error) {
        console.error("bootstrap failed", error);
        if (!cancelled) setFetchState("error");
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const headline = useMemo(() => {
    if (fetchState === "loading") return "Collecting AI tooling intelligence…";
    if (fetchState === "error") return "Could not reach upstream signals.";
    return "Latest AI Tool Signals";
  }, [fetchState]);

  return (
    <div className="panels">
      <section className="panel">
        <h2>{headline}</h2>
        {fetchState === "error" ? (
          <p>Upstream request failed — please try again shortly.</p>
        ) : stories.length === 0 && fetchState !== "loading" ? (
          <p>No relevant stories detected in the last crawl window.</p>
        ) : (
          <>
            <p>
              Tap a headline to generate an AI narrated video briefing ready for social, investor updates, or standups.
            </p>
            <NewsList
              stories={stories}
              selectedId={selectedStory?.id ?? null}
              onSelect={(story) => setSelectedStory(story)}
            />
          </>
        )}
      </section>
      <VideoComposer story={selectedStory} />
    </div>
  );
}
