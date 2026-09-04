import { DiElement, html } from "~/components/di-component.ts"
import { DiSchema, diNumber, diString } from "~/di-schema/di-schema.ts"

/** Describes the accepted properties for a database table. */
export type DbTableProperties = {
  id: string
  x: number
  y: number
  width: number
  height: number
  dx: number
  dy: number
  dw: number
  dh: number
}

/** Provides a positioned database table with slotted schema content. */
export class DbTable extends DiElement<DbTableProperties> {
  static override readonly schema = DiSchema.object({
    id: diString({ required: true }),
    x: diNumber({ default: 0, min: 0 }),
    y: diNumber({ default: 0, min: 0 }),
    width: diNumber({ default: 0, min: 0 }),
    height: diNumber({ default: 0, min: 0 }),
    dx: diNumber({ default: 0, min: 0 }),
    dy: diNumber({ default: 0, min: 0 }),
    dw: diNumber({ default: 0, min: 0 }),
    dh: diNumber({ default: 0, min: 0 }),
  })

  /** Renders the table shell and its schema rows. */
  protected override render() {
    const position = this.getPosition()
    const size = this.getSize()
    return html`<style>
        :host {
          position: absolute;
          display: inline-block;
          transform: translate(${position.x}px, ${position.y}px);
          ${size.width > 0 ? `width: ${size.width}px;` : ""}
          ${size.height > 0 ? `height: ${size.height}px;` : ""}
          box-sizing: border-box;
          z-index: 1;
        }

        .table {
          min-width: 220px;
          overflow: hidden;
          box-sizing: border-box;
          border: var(--di-table-border, var(--di-border-width, 1px) solid var(--di-border-color, currentColor));
          border-radius: var(--di-table-radius, var(--di-border-radius, 6px));
          background: var(--di-table-background, var(--di-background-color, Canvas));
          color: var(--di-table-color, var(--di-text-color, CanvasText));
          box-shadow: var(--di-table-shadow, var(--di-shadow, none));
          font-family: inherit;
        }

        ::slotted(db-table-name) {
          display: block;
          padding: var(--di-table-name-padding, 10px 12px);
          background: var(--di-table-name-background, var(--di-theme-primary-color, #4e18e1));
          color: var(--di-table-name-color, #ffffff);
          font-weight: 700;
        }

        ::slotted(db-table-column) {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: var(--di-table-column-gap, 12px);
          align-items: baseline;
          padding: var(--di-table-column-padding, 7px 12px);
          border-top: var(--di-table-column-border, var(--di-border-width, 1px) solid color-mix(in srgb, currentColor 14%, transparent));
          font-size: var(--di-table-column-font-size, 13px);
        }
      </style>
      <div class="table" part="table"><slot></slot></div>`
  }

  /** Resolves pixel coordinates from explicit or grid-based attributes. */
  private getPosition(): { x: number; y: number } {
    const properties = this.properties
    const grid = this.getGridSize()
    const padding = this.getGridPadding()
    return {
      x: padding + (this.hasAttribute("x") ? properties.x : properties.dx * grid),
      y: padding + (this.hasAttribute("y") ? properties.y : properties.dy * grid),
    }
  }

  /** Resolves pixel dimensions from explicit or grid-based attributes. */
  private getSize(): { width: number; height: number } {
    const properties = this.properties
    const grid = this.getGridSize()
    return {
      width: this.hasAttribute("width") ? properties.width : properties.dw * grid,
      height: this.hasAttribute("height") ? properties.height : properties.dh * grid,
    }
  }

  /** Reads the configured grid size from the containing diagram. */
  private getGridSize(): number {
    const diagram = this.closest("html-diagram")
    if (!(diagram instanceof HTMLElement)) return 20
    const grid = Number(diagram.getAttribute("grid"))
    return Number.isFinite(grid) && grid > 0 ? grid : 20
  }

  /** Reads the diagram padding in pixels. */
  private getGridPadding(): number {
    const diagram = this.closest("html-diagram")
    if (!(diagram instanceof HTMLElement)) return 20
    const paddingAttribute = diagram.getAttribute("padding")
    if (paddingAttribute === null) return this.getGridSize()
    const padding = Number(paddingAttribute)
    return Number.isFinite(padding) && padding >= 0
      ? padding * this.getGridSize()
      : this.getGridSize()
  }
}

/** Represents the visible name of a database table. */
export class DbTableName extends HTMLElement {}

/** Represents one database table column. */
export class DbTableColumn extends HTMLElement {}

/** Represents a database column name. */
export class DbTableColumnName extends HTMLElement {}

/** Represents a database column type. */
export class DbTableColumnType extends HTMLElement {}

/** Represents database column constraints. */
export class DbTableColumnConstraints extends HTMLElement {}

/** Registers the database table element family. */
function registerDbTableElements(): void {
  const elements = [
    ["db-table", DbTable],
    ["db-table-name", DbTableName],
    ["db-table-column", DbTableColumn],
    ["db-table-column-name", DbTableColumnName],
    ["db-table-column-type", DbTableColumnType],
    ["db-table-column-constraints", DbTableColumnConstraints],
  ] as const
  for (const [name, element] of elements) {
    if (!customElements.get(name)) customElements.define(name, element)
  }
}

registerDbTableElements()
