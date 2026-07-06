import { z } from "zod";

// The single source of the todo shape (AD-5). Imported by the repository now
// and by the API route handlers + client later. The domain shape is camelCase
// with an ISO-8601 UTC string timestamp (the repository maps the DB Date and
// snake_case columns to this shape).

/** FR-9/AD-6: cap is 1000 *code points*, not UTF-16 units. */
export const MAX_TEXT_CODE_POINTS = 1000;

// `.max(1000)` would count UTF-16 code units (an emoji = 2); count code points
// with the spread iterator so the cap matches the spec exactly.
export const todoTextSchema = z
  .string()
  .trim()
  .min(1, "Task text must not be empty.")
  .refine((value) => [...value].length <= MAX_TEXT_CODE_POINTS, {
    message: `Task text must be at most ${MAX_TEXT_CODE_POINTS} characters.`,
  })
  // Postgres text columns cannot store the NUL (U+0000) byte; reject it here so
  // it fails validation (clean 4xx) rather than erroring at insert time (500).
  .refine((value) => !value.split("").some((ch) => ch.charCodeAt(0) === 0), {
    message: "Task text must not contain a NUL character.",
  });

/** Create payload (POST /api/todos). */
export const createTodoSchema = z.object({
  text: todoTextSchema,
});

/** Partial update payload (PATCH /api/todos/[id]) — at least one field (AD-4). */
export const updateTodoSchema = z
  .object({
    text: todoTextSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.text !== undefined || value.completed !== undefined, {
    message: "Provide at least one field to update (text or completed).",
  });

/** The full domain/wire shape of a todo. */
export const todoSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  completed: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type Todo = z.infer<typeof todoSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
