import { DiSchema, type DiSchemaDefinition } from "~/di-schema/di-schema.ts"

/** Represents a value interpolated into a declarative template. */
export type DiTemplateValue = string | number | boolean | null | undefined | DiTemplateResult

/** Stores template strings and their interpolated values. */
export type DiTemplateResult = {
  strings: TemplateStringsArray
  values: DiTemplateValue[]
}

/** Creates a declarative component template. */
export function html(
  strings: TemplateStringsArray,
  ...values: DiTemplateValue[]
): DiTemplateResult {
  return { strings, values }
}

/** Provides schema-backed custom-element rendering. */
export abstract class DiElement<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> extends HTMLElement {
  static readonly schema: DiSchema<Record<string, unknown>> = DiSchema.object(
    {} as DiSchemaDefinition<Record<string, unknown>>,
  )

  /** Returns schema property names observed as HTML attributes. */
  static get observedAttributes(): string[] {
    return Object.keys(this.schema.definition)
  }

  private updateQueued = false

  /** Creates a component with an isolated shadow root. */
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  /** Starts rendering when the component enters the document. */
  connectedCallback(): void {
    this.requestUpdate()
  }

  /** Schedules rendering after an observed attribute changes. */
  attributeChangedCallback(): void {
    this.requestUpdate()
  }

  /** Returns validated properties parsed from component attributes. */
  get properties(): TProperties {
    const values: Record<string, unknown> = {}
    const schema = this.constructor as typeof DiElement & {
      schema: DiSchema<TProperties>
    }

    for (const [name, field] of Object.entries(schema.schema.definition)) {
      const attribute = this.getAttribute(name)
      if (attribute === null) continue
      values[name] = parseAttribute(attribute, field.type, field.values)
    }

    return schema.schema.parse(values) as TProperties
  }

  /** Produces the component's declarative view. */
  protected abstract render(): DiTemplateResult | string

  /** Runs after the component view is rendered. */
  protected updated(): void {}

  /** Schedules one coalesced component update. */
  requestUpdate(): void {
    if (this.updateQueued) return
    this.updateQueued = true
    queueMicrotask(() => {
      this.updateQueued = false
      if (!this.isConnected) return
      const result = this.render()
      this.shadowRoot?.replaceChildren(
        typeof result === "string" ? document.createTextNode(result) : renderTemplate(result),
      )
      this.updated()
    })
  }
}

/** Converts a declarative template into DOM nodes. */
function renderTemplate(
  template: DiTemplateResult,
  namespace = "http://www.w3.org/1999/xhtml",
): DocumentFragment {
  const markers = template.values.map((_, index) => `di-value-${index}`)
  const source = template.strings.reduce(
    (result, string, index) => result + string + (markers[index] ?? ""),
    "",
  )
  const elementTemplate = document.createElement("template")
  if (namespace === "http://www.w3.org/2000/svg") {
    const svgTemplate = document.createElementNS(namespace, "svg")
    svgTemplate.innerHTML = replaceSvgAttributeMarkers(source, template.values)
    elementTemplate.content.append(...Array.from(svgTemplate.childNodes))
  } else {
    elementTemplate.innerHTML = source
  }

  const walker = document.createTreeWalker(
    elementTemplate.content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )
  const nodes: (Element | Text)[] = []
  let comment = walker.nextNode()
  while (comment) {
    nodes.push(comment as Element | Text)
    comment = walker.nextNode()
  }

  for (const node of nodes) {
    if (node instanceof Element) {
      for (const attribute of Array.from(node.attributes)) {
        node.setAttribute(attribute.name, replaceAttributeMarkers(attribute.value, template.values))
      }
      continue
    }

    if (!node.textContent?.includes("di-value-")) continue
    node.replaceWith(
      renderTextNode(
        node.textContent,
        template.values,
        node.parentElement?.namespaceURI ?? undefined,
      ),
    )
  }

  return elementTemplate.content
}

/** Resolves interpolated SVG attributes before the browser parses them. */
function replaceSvgAttributeMarkers(source: string, values: DiTemplateValue[]): string {
  return source.replace(/(\s[\w:-]+=")([^"]*di-value-\d+[^\"]*)"/g, (_, prefix, value) => {
    return `${prefix}${replaceAttributeMarkers(value, values)}"`
  })
}

/** Replaces template markers embedded in text content. */
function renderTextNode(
  value: string,
  values: DiTemplateValue[],
  namespace?: string,
): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const marker = /di-value-(\d+)/g
  let offset = 0
  let match = marker.exec(value)
  while (match) {
    if (match.index > offset) {
      fragment.append(document.createTextNode(value.slice(offset, match.index)))
    }
    const replacement = values[Number(match[1])]
    if (replacement !== null && replacement !== undefined && replacement !== false) {
      fragment.append(
        typeof replacement === "object"
          ? renderTemplate(replacement, namespace)
          : document.createTextNode(String(replacement)),
      )
    }
    offset = match.index + match[0].length
    match = marker.exec(value)
  }
  fragment.append(document.createTextNode(value.slice(offset)))
  return fragment
}

/** Replaces template markers embedded in an attribute value. */
function replaceAttributeMarkers(value: string, values: DiTemplateValue[]): string {
  return value.replace(/di-value-(\d+)/g, (_, index: string) => {
    const replacement = values[Number(index)]
    return replacement === null || replacement === undefined || replacement === false
      ? ""
      : typeof replacement === "object"
        ? ""
        : String(replacement)
  })
}

/** Converts an HTML attribute string to its schema value. */
function parseAttribute(
  value: string,
  type: "string" | "number" | "boolean" | "enum",
  values?: readonly unknown[],
): unknown {
  if (type === "number") return Number(value)
  if (type === "boolean") return value === "" || value === "true"
  if (type === "enum") return values?.find(option => String(option) === value) ?? value
  return value
}
