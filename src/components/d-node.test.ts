/// <reference lib="dom" />

import { expect, test } from "bun:test"
import "~/components/html-diagram.ts"
import { DNode } from "~/components/d-node.ts"

/** Creates a registered node for DOM tests. */
const createNode = () => document.createElement("d-node") as DNode

test("creates and registers a diagram node", () => {
  const node = createNode()

  expect(node).toBeInstanceOf(DNode)
  expect(customElements.get("d-node")).toBe(DNode)
  expect(node.shadowRoot).not.toBeNull()
})

test("applies node defaults while requiring an id", () => {
  const node = createNode()
  node.setAttribute("id", "api")

  expect(node.properties).toEqual({
    id: "api",
    type: "default",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
  })
})

test("accepts supported node types and coordinate ranges", () => {
  const node = createNode()
  node.setAttribute("id", "database")
  node.setAttribute("type", "database")
  node.setAttribute("x", "120")
  node.setAttribute("y", "80")

  expect(node.properties).toEqual({
    id: "database",
    type: "database",
    x: 120,
    y: 80,
    width: 0,
    height: 0,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
  })
})

test("converts grid shorthand attributes using the containing diagram grid", async () => {
  const diagram = document.createElement("html-diagram")
  diagram.setAttribute("grid", "20")
  const node = createNode()
  node.setAttribute("id", "grid-node")
  node.setAttribute("dx", "0")
  node.setAttribute("dy", "4")
  node.setAttribute("dw", "2")
  node.setAttribute("dh", "3")
  diagram.append(node)
  document.body.append(diagram)
  await Promise.resolve()

  expect(node.properties.dx).toBe(0)
  expect(node.properties.dy).toBe(4)
  expect(node.properties.dw).toBe(2)
  expect(node.properties.dh).toBe(3)
  expect(node.shadowRoot?.querySelector("style")?.textContent).toContain("translate(20px, 100px)")
  expect(node.shadowRoot?.querySelector("style")?.textContent).toContain("width: 40px")
  expect(node.shadowRoot?.querySelector("style")?.textContent).toContain("height: 60px")
})

test("prefers explicit pixel coordinates and dimensions over grid shorthand", async () => {
  const diagram = document.createElement("html-diagram")
  diagram.setAttribute("grid", "20")
  const node = createNode()
  node.setAttribute("id", "explicit-node")
  node.setAttribute("dx", "4")
  node.setAttribute("x", "10")
  node.setAttribute("dw", "3")
  node.setAttribute("width", "55")
  diagram.append(node)
  document.body.append(diagram)
  await Promise.resolve()

  expect(node.shadowRoot?.querySelector("style")?.textContent).toContain("translate(30px, 20px)")
  expect(node.shadowRoot?.querySelector("style")?.textContent).toContain("width: 55px")
})

test("rejects missing ids, unsupported types, and negative coordinates", () => {
  const missingId = createNode()
  expect(() => missingId.properties).toThrow("id: Required value is missing")

  const invalidType = createNode()
  invalidType.setAttribute("id", "api")
  invalidType.setAttribute("type", "unknown")
  expect(() => invalidType.properties).toThrow("type: Expected a enum")

  const invalidPosition = createNode()
  invalidPosition.setAttribute("id", "api")
  invalidPosition.setAttribute("x", "-1")
  expect(() => invalidPosition.properties).toThrow("x: Must be at least 0")
})

test("renders positioned node content after connection", async () => {
  const node = createNode()
  node.setAttribute("id", "api")
  node.setAttribute("x", "120")
  node.setAttribute("y", "80")
  node.append("API Gateway")
  document.body.append(node)
  await Promise.resolve()

  expect((node.shadowRoot?.querySelector(".node") as HTMLElement)?.dataset.type).toBe("default")
  expect(node.shadowRoot?.querySelector('[part="node"]')).not.toBeNull()
  expect(node.shadowRoot?.querySelector("slot")).not.toBeNull()
  expect(node.shadowRoot?.host).toBe(node)
})
