import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

const videoFields = {
  title: v.string(),
  description: v.string(),
  url: v.string(),
};

export const create = mutation({
  args: videoFields,
  returns: v.id("videos"),
  handler: async (ctx, args) => {
    const videoId = await ctx.db.insert("videos", {
      title: args.title,
      description: args.description,
      url: args.url,
    });
    await ctx.scheduler.runAfter(0, internal.embeddings.generateEmbedding, {
      videoId,
    });
    return videoId;
  },
});

export const update = mutation({
  args: {
    id: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get("videos", id);
    if (existing === null) {
      throw new Error("Video not found");
    }

    const patch: Partial<typeof fields> = {};
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined)
      patch.description = fields.description;
    if (fields.url !== undefined) patch.url = fields.url;

    await ctx.db.patch("videos", id, patch);

    if (fields.title !== undefined || fields.description !== undefined) {
      await ctx.scheduler.runAfter(0, internal.embeddings.generateEmbedding, {
        videoId: id,
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("videos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("videos", args.id);
    return null;
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("videos"),
        _creationTime: v.number(),
        title: v.string(),
        description: v.string(),
        url: v.string(),
        embedding: v.optional(v.array(v.float64())),
        embeddingModel: v.optional(v.string()),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
    ),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("videos") },
  returns: v.union(
    v.object({
      _id: v.id("videos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      embedding: v.optional(v.array(v.float64())),
      embeddingModel: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get("videos", args.id);
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("videos") },
  returns: v.union(
    v.object({
      _id: v.id("videos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      embedding: v.optional(v.array(v.float64())),
      embeddingModel: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get("videos", args.id);
  },
});

export const setEmbedding = internalMutation({
  args: {
    id: v.id("videos"),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("videos", args.id, {
      embedding: args.embedding,
      embeddingModel: args.embeddingModel,
    });
    return null;
  },
});

export const getManyByIds = internalQuery({
  args: { ids: v.array(v.id("videos")) },
  returns: v.array(
    v.object({
      _id: v.id("videos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      url: v.string(),
      embedding: v.optional(v.array(v.float64())),
      embeddingModel: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const docs = await Promise.all(
      args.ids.map((id) => ctx.db.get("videos", id)),
    );
    return docs.filter(
      (doc): doc is NonNullable<typeof doc> => doc !== null,
    );
  },
});
