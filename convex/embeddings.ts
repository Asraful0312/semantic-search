"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const EMBEDDING_MODEL = "text-embedding-3-small";

async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Run `npx convex env set OPENAI_API_KEY sk-...`",
    );
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI embeddings request failed (${response.status}): ${errorBody}`,
    );
  }

  const json = (await response.json()) as {
    data: { embedding: number[] }[];
  };
  return json.data[0].embedding;
}

export const generateEmbedding = internalAction({
  args: { videoId: v.id("videos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const video = await ctx.runQuery(internal.videos.getInternal, {
      id: args.videoId,
    });
    if (video === null) {
      return null;
    }

    const input = `${video.title}\n\n${video.description}`;
    const embedding = await embedText(input);

    await ctx.runMutation(internal.videos.setEmbedding, {
      id: args.videoId,
      embedding,
      embeddingModel: EMBEDDING_MODEL,
    });
    return null;
  },
});

type SearchResult = {
  _id: Id<"videos">;
  _creationTime: number;
  title: string;
  description: string;
  url: string;
  score: number;
};

export const search = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("videos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      score: v.number(),
    }),
  ),
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const vector = await embedText(args.query);

    const results = await ctx.vectorSearch("videos", "by_embedding", {
      vector,
      limit: args.limit ?? 10,
    });

    const ids: Id<"videos">[] = results.map((r) => r._id);
    const docs = await ctx.runQuery(internal.videos.getManyByIds, { ids });
    const scoreById = new Map(results.map((r) => [r._id, r._score]));
    const docById = new Map(docs.map((d) => [d._id, d]));

    const output: SearchResult[] = [];
    for (const id of ids) {
      const doc = docById.get(id);
      if (doc === undefined) continue;
      output.push({
        _id: doc._id,
        _creationTime: doc._creationTime,
        title: doc.title,
        description: doc.description,
        url: doc.url,
        score: scoreById.get(id) ?? 0,
      });
    }
    return output;
  },
});
