import { z } from "zod"
import { CardFormat } from "@prisma/client"

// ── Shared primitives ─────────────────────────────────────────────────────────

export const roleSchema = z.enum(["AGENT", "MANAGER", "ADMIN", "SUPER_ADMIN"])
export const orgRoleSchema = z.enum(["AGENT", "MANAGER"])
export const cardFormatSchema = z.nativeEnum(CardFormat)
export const ratingSchema = z.enum(["AGAIN", "HARD", "GOOD", "EASY"])

const trimmedString = (min = 1) =>
  z.string().trim().min(min, { message: "Cannot be empty" })

// ── Deck schemas ──────────────────────────────────────────────────────────────

export const createDeckSchema = z.object({
  name:        trimmedString().max(200),
  description: z.string().trim().max(1000).optional(),
  isMandatory: z.boolean().optional().default(false),
})

export const updateDeckSchema = z.object({
  name:        trimmedString().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  isMandatory: z.boolean().optional(),
  inRotation:  z.boolean().optional(),
})

// ── Card schemas ──────────────────────────────────────────────────────────────

const tagsSchema = z
  .array(z.string().trim().max(50))
  .max(5)
  .optional()
  .default([])
  .transform((tags) => tags.map((t) => t.toLowerCase()))

export const createCardSchema = z.object({
  question:   trimmedString().max(500),
  answer:     trimmedString().max(2000),
  format:     cardFormatSchema.optional().default(CardFormat.QA),
  tags:       tagsSchema,
  difficulty: z.number().int().min(1).max(3).optional().default(1),
})

export const updateCardSchema = z.object({
  question: trimmedString().max(500).optional(),
  answer:   trimmedString().max(2000).optional(),
  format:   cardFormatSchema.optional(),
  tags:     tagsSchema,
})

export const bulkApproveSchema = z
  .union([
    z.object({ approveAll: z.literal(true) }),
    z.object({ cardIds: z.array(z.string().uuid()).min(1) }),
  ])
  .refine(
    (v) => "approveAll" in v || ("cardIds" in v && v.cardIds.length > 0),
    { message: "Provide approveAll: true or a non-empty cardIds array" }
  )

// ── Assign schema ─────────────────────────────────────────────────────────────

export const assignSchema = z
  .union([
    z.object({ teamId:  z.string().min(1) }),
    z.object({ userIds: z.array(z.string().min(1)).min(1) }),
  ])
  .refine(
    (v) => "teamId" in v || ("userIds" in v && v.userIds.length > 0),
    { message: "Provide teamId or a non-empty userIds array" }
  )

// ── Review schema ─────────────────────────────────────────────────────────────

export const submitReviewSchema = z.object({
  userCardId: z.string().min(1),
  rating:     ratingSchema,
})

// ── Team schemas ──────────────────────────────────────────────────────────────

export const createTeamSchema = z.object({
  name: trimmedString().max(200),
})

export const updateTeamSchema = z.object({
  name: trimmedString().max(200),
})

export const createInviteSchema = z.object({
  email: z.string().trim().email(),
  role:  orgRoleSchema,
})

// ── Org schemas ───────────────────────────────────────────────────────────────

export const orgSettingsSchema = z.object({
  name:      trimmedString().max(200).optional(),
  studyMode: z.enum(["AUTO_ROTATE", "MANUAL"]).optional(),
})

export const createOrgUserSchema = z.object({
  name:             trimmedString().max(200),
  email:            z.string().trim().email(),
  role:             orgRoleSchema.optional().default("AGENT"),
})

// ── Admin schemas ─────────────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: trimmedString().max(200),
})

export const createPlatformUserSchema = z.object({
  name:             trimmedString().max(200),
  email:            z.string().trim().email(),
  role:             roleSchema.optional().default("AGENT"),
  orgId:            z.string().min(1),
  sendWelcomeEmail: z.boolean().optional().default(true),
})

// ── User schemas ──────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name:  trimmedString().max(200).optional(),
  image: z
    .string()
    .refine((v) => v.startsWith("data:image/"), { message: "Must be a data URL" })
    .optional()
    .nullable(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

export const acceptInviteSchema = z.object({
  name:     trimmedString().max(200).optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

export const generateCardsSchema = z.object({
  sourceDocumentId: z.string().min(1),
})
