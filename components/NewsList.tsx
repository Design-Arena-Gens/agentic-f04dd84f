"use client";

import { clsx } from "clsx";

export type Story = {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  talkingPoints: string[];
  postedAt: string;
  points: number;
  url: string;
  cadence: string;
};

type NewsListProps = {
  stories: Story[];
  selectedId: string | null;
  onSelect: (story: Story) => void;
};

export function NewsList({ stories, selectedId, onSelect }: NewsListProps) {
  return (
    <div className="news-list">
      {stories.map((story) => (
        <article
          key={story.id}
          className={clsx("news-card", selectedId === story.id && "selected")}
          onClick={() => onSelect(story)}
        >
          <span>
            <strong>{story.cadence}</strong> • {new Date(story.postedAt).toLocaleString()}
          </span>
          <h3>{story.title}</h3>
          <p>{story.synopsis}</p>
          <div className="chip">
            <span>Author</span>
            <strong>{story.author}</strong>
          </div>
          <div className="chip">
            <span>Score</span>
            <strong>{story.points}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
