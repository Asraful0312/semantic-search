import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  videos: defineTable({
    title: v.string(),
    description: v.string(),
    url: v.string(),
    embedding: v.optional(v.array(v.float64())),
    embeddingModel: v.optional(v.string()),
  }).vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    }),
});
