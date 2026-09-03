/** Represents a scalar value accepted by a schema. */
export type DiPrimitive = string | number | boolean

/** Describes one schema validation failure. */
export type DiSchemaIssue = {
  path: string
  message: string
}

/** Describes validation rules and editor metadata for one property. */
export type DiField<T> = {
  type: "string" | "number" | "boolean" | "enum"
  required?: boolean
  default?: T
  description?: string
  values?: readonly T[]
  min?: number
  max?: number
}

/** Maps component property names to their field definitions. */
export type DiSchemaDefinition<T extends Record<string, unknown>> = {
  [K in keyof T]-?: DiField<T[K]>
}

/** Represents either validated schema data or validation failures. */
export type DiSafeParseResult<T> =
  { success: true; data: T } | { success: false; issues: DiSchemaIssue[] }

/** Describes schema validation failures. */
export class DiSchemaError extends Error {
  /** Describes schema validation failures. */
  constructor(public readonly issues: DiSchemaIssue[]) {
    super(issues.map(issue => `${issue.path}: ${issue.message}`).join("; "))
    this.name = "DiSchemaError"
  }
}

/** Validates structured component properties. */
export class DiSchema<T extends Record<string, unknown>> {
  /** Creates a schema from a property definition. */
  constructor(public readonly definition: DiSchemaDefinition<T>) {}

  /** Creates an object schema from a property definition. */
  static object<T extends Record<string, unknown>>(definition: DiSchemaDefinition<T>): DiSchema<T> {
    return new DiSchema(definition)
  }

  /** Parses a value or throws its validation errors. */
  parse(input: unknown): T {
    const result = this.safeParse(input)
    if (!result.success) {
      throw new DiSchemaError(result.issues)
    }
    return result.data
  }

  /** Validates a value without throwing. */
  safeParse(input: unknown): DiSafeParseResult<T> {
    if (!isRecord(input)) {
      return {
        success: false,
        issues: [{ path: "$", message: "Expected an object" }],
      }
    }

    const output: Record<string, unknown> = {}
    const issues: DiSchemaIssue[] = []

    for (const [name, field] of Object.entries(this.definition)) {
      const value = input[name] ?? field.default
      if (value === undefined) {
        if (field.required) {
          issues.push({ path: name, message: "Required value is missing" })
        }
        continue
      }

      const issue = validateField(name, value, field)
      if (issue) {
        issues.push(issue)
      } else {
        output[name] = value
      }
    }

    return issues.length > 0 ? { success: false, issues } : { success: true, data: output as T }
  }

  /** Returns schema metadata for editors and tooling. */
  metadata(): DiSchemaDefinition<T> {
    return this.definition
  }
}

/** Defines a string property. */
export function diString(options: Omit<DiField<string>, "type"> = {}): DiField<string> {
  return { type: "string", ...options }
}

/** Defines a numeric property. */
export function diNumber(options: Omit<DiField<number>, "type"> = {}): DiField<number> {
  return { type: "number", ...options }
}

/** Defines a boolean property. */
export function diBoolean(options: Omit<DiField<boolean>, "type"> = {}): DiField<boolean> {
  return { type: "boolean", ...options }
}

/** Defines a property constrained to a fixed set of values. */
export function diEnum<T extends DiPrimitive>(
  values: readonly T[],
  options: Omit<DiField<T>, "type" | "values"> = {},
): DiField<T> {
  return { type: "enum", values, ...options }
}

/** Validates a value against a single field definition. */
function validateField<T>(
  name: string,
  value: unknown,
  field: DiField<T>,
): DiSchemaIssue | undefined {
  const validType =
    (field.type === "string" && typeof value === "string") ||
    (field.type === "number" && typeof value === "number" && Number.isFinite(value)) ||
    (field.type === "boolean" && typeof value === "boolean") ||
    (field.type === "enum" && field.values?.includes(value as T))

  return validType
    ? validateRange(name, value, field)
    : { path: name, message: `Expected a ${field.type}` }
}

/** Validates numeric minimum and maximum constraints. */
function validateRange<T>(
  name: string,
  value: unknown,
  field: DiField<T>,
): DiSchemaIssue | undefined {
  if (typeof value !== "number") return undefined
  if (field.min !== undefined && value < field.min) {
    return { path: name, message: `Must be at least ${field.min}` }
  }
  if (field.max !== undefined && value > field.max) {
    return { path: name, message: `Must be at most ${field.max}` }
  }
  return undefined
}

/** Checks whether a value is a non-null object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
