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

  expect(diagram.properties).toEqual({
    title: "",
    interactive: false,
    grid: 20,
    padding: 1,
  })
})

test("accepts interactive, grid, and padding values", () => {
  const diagram = createDiagram()
  diagram.setAttribute("interactive", "")
  diagram.setAttribute("title", "Decision tree")
  diagram.setAttribute("grid", "10")
  diagram.setAttribute("padding", "2")

  expect(diagram.properties).toEqual({
    title: "Decision tree",
    interactive: true,
    grid: 10,
    padding: 2,
  })
})

test("rejects a non-positive grid size", () => {
  const diagram = createDiagram()
  diagram.setAttribute("grid", "0")

  expect(() => diagram.properties).toThrow("grid: Must be at least 1")
})

test("rejects negative diagram padding", () => {
  const diagram = createDiagram()
  diagram.setAttribute("padding", "-1")

  expect(() => diagram.properties).toThrow("padding: Must be at least 0")
})

test("renders a viewport with slotted children after connection", async () => {
  const diagram = createDiagram()
  diagram.append(document.createElement("span"))
  document.body.append(diagram)
  await Promise.resolve()

  expect(diagram.shadowRoot?.querySelector(".viewport")).not.toBeNull()
  expect(diagram.shadowRoot?.querySelector(".canvas slot")).not.toBeNull()
  expect(diagram.shadowRoot?.querySelector("style")?.textContent).toContain("height: 100%")
  expect((diagram.shadowRoot?.querySelector(".viewport") as HTMLElement)?.dataset.grid).toBe("20")
})

test("renders a titled callout when title is provided", async () => {
  const diagram = createDiagram()
  diagram.setAttribute("title", "Decision tree")
  document.body.append(diagram)
  await Promise.resolve()

  const title = diagram.shadowRoot?.querySelector('[part="title"]')
  expect(title?.textContent).toBe("Decision tree")
  expect(diagram.shadowRoot?.querySelector(".title")?.textContent).toBe("Decision tree")
  expect(diagram.shadowRoot?.querySelector("style")?.textContent).toContain(
    "left: var(--di-canvas-radius, var(--di-border-radius, 8px))",
  )
  expect(diagram.shadowRoot?.querySelector("style")?.textContent).toContain(
    "transform: translateY(-50%)",
  )
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
  diagram.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect
  node.getBoundingClientRect = () => ({ right: 80, bottom: 160 }) as DOMRect
  resizeCallback?.([], {} as ResizeObserver)
  expect(edgeUpdates).toBe(1)
  expect(diagram.style.getPropertyValue("--di-content-height")).toBe("180px")
  expect(diagram.style.getPropertyValue("--di-content-width")).toBe("100px")

  diagram.remove()
  expect(disconnected).toBe(true)
  globalThis.ResizeObserver = originalResizeObserver
})
