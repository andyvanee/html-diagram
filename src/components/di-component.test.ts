/// <reference lib="dom" />

import { expect, test } from "bun:test"
import { DiElement, html } from "~/components/di-component.ts"
import { DiSchema, diBoolean, diEnum, diNumber, diString } from "~/di-schema/di-schema.ts"

/** Describes the properties used by the test custom element. */
type ExampleProperties = {
  label: string
  count: number
  enabled: boolean
  direction: "LR" | "TB"
}

/** Provides a schema-backed custom element for DOM tests. */
class TestDiagramElement extends DiElement<ExampleProperties> {
  static override readonly schema = DiSchema.object({
    label: diString({ required: true }),
    count: diNumber({ default: 1, min: 0, max: 10 }),
    enabled: diBoolean({ default: false }),
    direction: diEnum(["LR", "TB"] as const, { default: "LR" }),
  })

  /** Renders the test element's property values. */
  protected override render() {
    const { label, count, enabled, direction } = this.properties
    return html`<p data-label="${label}">
      ${label}: ${count} (${direction}) ${enabled ? "on" : "off"}
    </p>`
  }
}

const tagName = "test-di-component"
if (!customElements.get(tagName)) {
  customElements.define(tagName, TestDiagramElement)
}

/** Creates a registered test element instance. */
const createTestElement = () => document.createElement(tagName) as TestDiagramElement

test("creates an element instance through the custom element registry", () => {
  const element = createTestElement()

  expect(element).toBeInstanceOf(TestDiagramElement)
  expect(element.shadowRoot).not.toBeNull()
})

test("derives observed attributes from the schema", () => {
  expect(TestDiagramElement.observedAttributes).toEqual(["label", "count", "enabled", "direction"])
})

test("parses accepted string, number, boolean, and enum attributes", () => {
  const element = createTestElement()
  element.setAttribute("label", "Orders")
  element.setAttribute("count", "3")
  element.setAttribute("enabled", "true")
  element.setAttribute("direction", "TB")

  expect(element.properties).toEqual({
    label: "Orders",
    count: 3,
    enabled: true,
    direction: "TB",
  })
})

test("applies schema defaults for omitted optional attributes", () => {
  const element = createTestElement()
  element.setAttribute("label", "Orders")

  expect(element.properties).toEqual({
    label: "Orders",
    count: 1,
    enabled: false,
    direction: "LR",
  })
})

test("rejects invalid attributes and values outside the accepted range", () => {
  const element = createTestElement()
  element.setAttribute("label", "Orders")
  element.setAttribute("count", "11")
  element.setAttribute("enabled", "sometimes")
  element.setAttribute("direction", "DIAGONAL")

  expect(() => element.properties).toThrow("count: Must be at most 10")
})

test("renders declarative HTML and interpolated values after connection", async () => {
  const element = createTestElement()
  element.setAttribute("label", "Orders")
  element.setAttribute("count", "2")
  document.body.append(element)
  await Promise.resolve()

  expect(element.shadowRoot?.querySelector("p")?.textContent?.trim()).toBe("Orders: 2 (LR) off")
  expect(element.shadowRoot?.querySelector("p")?.getAttribute("data-label")).toBe("Orders")
})
