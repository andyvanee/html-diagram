/// <reference lib="dom" />

import { expect, test } from "bun:test"
import "~/components/html-diagram.ts"
import { DEdge } from "~/components/d-edge.ts"

/** Creates a registered edge for DOM tests. */
const createEdge = () => document.createElement("d-edge") as DEdge

test("creates and registers a diagram edge", () => {
  const edge = createEdge()

  expect(edge).toBeInstanceOf(DEdge)
  expect(customElements.get("d-edge")).toBe(DEdge)
  expect(edge.shadowRoot).not.toBeNull()
})

test("applies edge defaults while requiring endpoints", () => {
  const edge = createEdge()
  edge.setAttribute("from", "start")
  edge.setAttribute("to", "finish")

  expect(edge.properties).toEqual({
    from: "start",
    to: "finish",
    label: "",
    line: "straight",
    animated: false,
  })
})

test("accepts labels, supported line styles, and animation", () => {
  const edge = createEdge()
  edge.setAttribute("from", "start:p-out")
  edge.setAttribute("to", "finish:p-in")
  edge.setAttribute("label", "Next")
  edge.setAttribute("line", "orthogonal")
  edge.setAttribute("animated", "true")

  expect(edge.properties).toEqual({
    from: "start:p-out",
    to: "finish:p-in",
    label: "Next",
    line: "orthogonal",
    animated: true,
  })
})

test("rejects missing endpoints and unsupported line styles", () => {
  const missingEndpoints = createEdge()
  expect(() => missingEndpoints.properties).toThrow("from: Required value is missing")

  const missingTo = createEdge()
  missingTo.setAttribute("from", "start")
  expect(() => missingTo.properties).toThrow("to: Required value is missing")

  const invalidLine = createEdge()
  invalidLine.setAttribute("from", "start")
  invalidLine.setAttribute("to", "finish")
  invalidLine.setAttribute("line", "diagonal")
  expect(() => invalidLine.properties).toThrow("line: Expected a enum")
})

test("renders edge metadata after connection", async () => {
  const edge = createEdge()
  edge.setAttribute("from", "start")
  edge.setAttribute("to", "finish")
  edge.setAttribute("label", "Next")
  document.body.append(edge)
  await Promise.resolve()

  const rendered = edge.shadowRoot?.querySelector("div")
  expect(rendered?.dataset.from).toBe("start")
  expect(rendered?.dataset.to).toBe("finish")
  expect(rendered?.getAttribute("aria-label")).toBe("Next")
  expect(rendered?.querySelector(".edge-label")?.textContent).toBe("Next")
  expect(rendered?.getAttribute("part")).toBe("edge-box")
  expect(rendered?.querySelector('[part="edge-label"]')?.textContent).toBe("Next")
  expect(edge.shadowRoot?.querySelector("style")?.textContent).toContain(
    "transform: translate(-50%, -50%)",
  )
})

test("renders a visible SVG connector between endpoint elements", async () => {
  const diagram = document.createElement("html-diagram")
  const start = document.createElement("div")
  const finish = document.createElement("div")
  const edge = createEdge()
  start.id = "visual-start"
  finish.id = "visual-finish"
  edge.setAttribute("from", start.id)
  edge.setAttribute("to", finish.id)
  edge.setAttribute("line", "curved")
  diagram.append(start, finish, edge)
  document.body.append(diagram)

  diagram.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 240 }) as DOMRect
  edge.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 240 }) as DOMRect
  start.getBoundingClientRect = () => ({ left: 40, top: 80, width: 120, height: 40 }) as DOMRect
  finish.getBoundingClientRect = () => ({ left: 280, top: 80, width: 120, height: 40 }) as DOMRect
  edge.requestUpdate()
  await Promise.resolve()

  const path = edge.shadowRoot?.querySelector("svg > path")
  expect(path).not.toBeNull()
  expect(path?.getAttribute("d")).toContain("M 160 100")
  expect(path?.getAttribute("d")).toContain("280 100")
  expect(path?.namespaceURI).toBe("http://www.w3.org/2000/svg")
  expect(edge.shadowRoot?.querySelector("svg text")).toBeNull()
  expect(edge.shadowRoot?.querySelector(".edge-label") ?? null).toBeNull()
  expect(edge.shadowRoot?.querySelector("marker")).not.toBeNull()
  expect(edge.shadowRoot?.querySelector("svg")?.getAttribute("preserveAspectRatio")).toBe("none")
  expect(edge.shadowRoot?.querySelector("style")?.textContent).toContain(
    "stroke: var(--di-edge-color, var(--di-theme-primary-color, #2563eb))",
  )
})

test("curves toward a diagonal target", async () => {
  const diagram = document.createElement("html-diagram")
  const start = document.createElement("div")
  const finish = document.createElement("div")
  const edge = createEdge()
  start.id = "curve-start"
  finish.id = "curve-finish"
  edge.setAttribute("from", start.id)
  edge.setAttribute("to", finish.id)
  edge.setAttribute("line", "curved")
  diagram.append(start, finish, edge)
  document.body.append(diagram)

  edge.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 400 }) as DOMRect
  start.getBoundingClientRect = () => ({ left: 280, top: 80, width: 120, height: 40 }) as DOMRect
  finish.getBoundingClientRect = () => ({ left: 40, top: 280, width: 120, height: 40 }) as DOMRect
  edge.requestUpdate()
  await Promise.resolve()

  expect(edge.shadowRoot?.querySelector("svg > path")?.getAttribute("d")).toContain("C 316 244")
})
