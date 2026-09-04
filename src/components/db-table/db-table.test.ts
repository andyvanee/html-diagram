/// <reference lib="dom" />

import { expect, test } from "bun:test"
import "~/components/html-diagram.ts"
import {
  DbTable,
  DbTableColumn,
  DbTableColumnConstraints,
  DbTableColumnName,
  DbTableColumnType,
  DbTableName,
} from "~/components/db-table/db-table.ts"

/** Creates a registered database table for DOM tests. */
const createTable = () => document.createElement("db-table") as DbTable

test("creates and registers the database table element family", () => {
  const table = createTable()

  expect(table).toBeInstanceOf(DbTable)
  expect(customElements.get("db-table")).toBe(DbTable)
  expect(customElements.get("db-table-name")).toBe(DbTableName)
  expect(customElements.get("db-table-column")).toBe(DbTableColumn)
  expect(customElements.get("db-table-column-name")).toBe(DbTableColumnName)
  expect(customElements.get("db-table-column-type")).toBe(DbTableColumnType)
  expect(customElements.get("db-table-column-constraints")).toBe(DbTableColumnConstraints)
  expect(table.shadowRoot).not.toBeNull()
})

test("applies table defaults while requiring an id", () => {
  const table = createTable()
  table.setAttribute("id", "users")

  expect(table.properties).toEqual({
    id: "users",
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

test("renders table names and columns as slotted content", async () => {
  const table = createTable()
  table.setAttribute("id", "users")
  const name = document.createElement("db-table-name")
  const column = document.createElement("db-table-column")
  name.textContent = "Users"
  column.innerHTML =
    "<db-table-column-name>id</db-table-column-name><db-table-column-type>int</db-table-column-type><db-table-column-constraints>PK</db-table-column-constraints>"
  table.append(name, column)
  document.body.append(table)
  await Promise.resolve()

  expect(table.shadowRoot?.querySelector('[part="table"]')).not.toBeNull()
  expect(table.shadowRoot?.querySelector("slot")).not.toBeNull()
  expect(name.textContent).toBe("Users")
  expect(column.querySelector("db-table-column-name")?.textContent).toBe("id")
})

test("applies diagram padding to grid coordinates", async () => {
  const diagram = document.createElement("html-diagram")
  diagram.setAttribute("grid", "10")
  diagram.setAttribute("padding", "2")
  const table = createTable()
  table.setAttribute("id", "users")
  table.setAttribute("dx", "3")
  table.setAttribute("dy", "4")
  diagram.append(table)
  document.body.append(diagram)
  await Promise.resolve()

  expect(table.shadowRoot?.querySelector("style")?.textContent).toContain("translate(50px, 60px)")
})

test("rejects missing ids and negative coordinates", () => {
  const missingId = createTable()
  expect(() => missingId.properties).toThrow("id: Required value is missing")

  const invalidPosition = createTable()
  invalidPosition.setAttribute("id", "users")
  invalidPosition.setAttribute("dy", "-1")
  expect(() => invalidPosition.properties).toThrow("dy: Must be at least 0")
})
