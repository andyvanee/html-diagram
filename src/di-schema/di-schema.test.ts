import { expect, test } from "bun:test"
import {
  DiSchema,
  DiSchemaError,
  diBoolean,
  diEnum,
  diNumber,
  diString,
} from "~/di-schema/di-schema.ts"

const schema = DiSchema.object({
  name: diString({ required: true, description: "Display name" }),
  count: diNumber({ default: 1, min: 0, max: 10 }),
  enabled: diBoolean({ default: true }),
  direction: diEnum(["LR", "TB"] as const, { default: "LR" }),
})

test("creates a schema and exposes its metadata", () => {
  expect(schema).toBeInstanceOf(DiSchema)
  expect(schema.metadata().name).toEqual({
    type: "string",
    required: true,
    description: "Display name",
  })
})

test("accepts valid values, defaults, enum values, and range boundaries", () => {
  expect(schema.parse({ name: "Diagram", count: 0, direction: "TB" })).toEqual({
    name: "Diagram",
    count: 0,
    enabled: true,
    direction: "TB",
  })
  expect(schema.parse({ name: "Diagram", count: 10 })).toEqual({
    name: "Diagram",
    count: 10,
    enabled: true,
    direction: "LR",
  })
})

test("rejects non-object input", () => {
  const result = schema.safeParse(null)

  expect(result).toEqual({
    success: false,
    issues: [{ path: "$", message: "Expected an object" }],
  })
})

test("rejects missing required values", () => {
  const result = schema.safeParse({})

  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.issues).toContainEqual({
      path: "name",
      message: "Required value is missing",
    })
  }
})

test("rejects invalid string, number, boolean, and enum values", () => {
  const result = schema.safeParse({
    name: 4,
    count: "many",
    enabled: "yes",
    direction: "DIAGONAL",
  })

  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.issues).toEqual([
      { path: "name", message: "Expected a string" },
      { path: "count", message: "Expected a number" },
      { path: "enabled", message: "Expected a boolean" },
      { path: "direction", message: "Expected a enum" },
    ])
  }
})

test("rejects values outside an inclusive numeric range", () => {
  expect(schema.safeParse({ name: "Low", count: -1 }).success).toBe(false)
  expect(schema.safeParse({ name: "High", count: 11 }).success).toBe(false)
})

test("throws a DiSchemaError from parse when validation fails", () => {
  expect(() => schema.parse({ name: "Invalid", count: 11 })).toThrow(DiSchemaError)
})
