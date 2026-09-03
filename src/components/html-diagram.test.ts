/// <reference lib="dom" />

import { expect, test } from "bun:test"
import { HtmlDiagram } from "~/components/html-diagram.ts"

/** Creates a registered diagram root for DOM tests. */
const createDiagram = () => document.createElement("html-diagram") as HtmlDiagram

test("creates and registers the diagram root", () => {
  const diagram = createDiagram()

  expect(diagram).toBeInstanceOf(HtmlDiagram)
  expect(customElements.get("html-diagram")).toBe(HtmlDiagram)
  expect(diagram.shadowRoot).not.toBeNull()
})

test("applies default diagram properties", () => {
  const diagram = createDiagram()
  diagram.setAttribute("layout", "manual")

  expect(diagram.properties).toEqual({
    layout: "manual",
    direction: "LR",
    interactive: false,
    grid: 20,
  })
})

test("accepts supported layout, direction, and interactive values", () => {
  const diagram = createDiagram()
  diagram.setAttribute("layout", "dagre")
  diagram.setAttribute("direction", "TB")
  diagram.setAttribute("interactive", "")
  diagram.setAttribute("grid", "10")

  expect(diagram.properties).toEqual({
    layout: "dagre",
    direction: "TB",
    interactive: true,
    grid: 10,
  })
})

test("rejects unsupported diagram property values", () => {
  const diagram = createDiagram()
  diagram.setAttribute("layout", "unknown")

  expect(() => diagram.properties).toThrow("layout: Expected a enum")
})

test("rejects a non-positive grid size", () => {
  const diagram = createDiagram()
  diagram.setAttribute("grid", "0")

  expect(() => diagram.properties).toThrow("grid: Must be at least 1")
})

test("renders a viewport with slotted children after connection", async () => {
  const diagram = createDiagram()
  diagram.setAttribute("direction", "TB")
  diagram.append(document.createElement("span"))
  document.body.append(diagram)
  await Promise.resolve()

  expect(diagram.shadowRoot?.querySelector(".viewport")).not.toBeNull()
  expect(diagram.shadowRoot?.querySelector(".canvas slot")).not.toBeNull()
  expect((diagram.shadowRoot?.querySelector(".viewport") as HTMLElement)?.dataset.direction).toBe(
    "TB",
  )
  expect(diagram.shadowRoot?.querySelector("style")?.textContent).toContain("height: 100%")
  expect((diagram.shadowRoot?.querySelector(".viewport") as HTMLElement)?.dataset.grid).toBe("20")
})

test("observes diagram geometry and disconnects the observer", () => {
  const originalResizeObserver = globalThis.ResizeObserver
  const observed: Element[] = []
  let disconnected = false
  let resizeCallback: ResizeObserverCallback | undefined

  class TestResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback
    }

    observe(element: Element) {
      observed.push(element)
    }

    unobserve(_element: Element) {}

    disconnect() {
      disconnected = true
    }
  }

  globalThis.ResizeObserver = TestResizeObserver as typeof ResizeObserver
  const diagram = createDiagram()
  const node = document.createElement("d-node")
  const edge = document.createElement("d-edge") as HTMLElement & { requestUpdate: () => void }
  let edgeUpdates = 0
  node.id = "observed-node"
  edge.requestUpdate = () => {
    edgeUpdates += 1
  }
  diagram.append(node, edge)
  document.body.append(diagram)

  expect(observed).toContain(diagram)
  expect(observed).toContain(node)
  expect(observed).toContain(edge)

  edgeUpdates = 0
  resizeCallback?.([], {} as ResizeObserver)
  expect(edgeUpdates).toBe(1)

  diagram.remove()
  expect(disconnected).toBe(true)
  globalThis.ResizeObserver = originalResizeObserver
})
