import { DiElement, html } from "~/components/di-component.ts"
import { DiSchema, diEnum, diNumber, diString } from "~/di-schema/di-schema.ts"

/** Describes the accepted properties for a diagram node. */
export type DNodeProperties = {
  id: string
  type: "default" | "service" | "database"
  x: number
  y: number
  width: number
  height: number
  dx: number
  dy: number
  dw: number
  dh: number
}

/** Provides a positioned HTML container for diagram content. */
export class DNode extends DiElement<DNodeProperties> {
  static override readonly schema = DiSchema.object({
    id: diString({ required: true }),
    type: diEnum(["default", "service", "database"] as const, { default: "default" }),
    x: diNumber({ default: 0, min: 0 }),
    y: diNumber({ default: 0, min: 0 }),
    width: diNumber({ default: 0, min: 0 }),
    height: diNumber({ default: 0, min: 0 }),
    dx: diNumber({ default: 0, min: 0 }),
    dy: diNumber({ default: 0, min: 0 }),
    dw: diNumber({ default: 0, min: 0 }),
    dh: diNumber({ default: 0, min: 0 }),
  })

  /** Renders the node container around its light-DOM content. */
  protected override render() {
    const { type } = this.properties
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

        .node {
          border: 1px solid currentColor;
          border-radius: 6px;
          padding: 12px 16px;
          background: Canvas;
          color: CanvasText;
          font-family: sans-serif;
          min-width: 120px;
        }
      </style>
      <div class="node" data-type="${type}"><slot></slot></div>`
  }

  /** Resolves pixel coordinates from explicit or grid-based attributes. */
  private getPosition(): { x: number; y: number } {
    const properties = this.properties
    const grid = this.getGridSize()
    return {
      x: this.hasAttribute("x") ? properties.x : properties.dx * grid,
      y: this.hasAttribute("y") ? properties.y : properties.dy * grid,
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
}

if (!customElements.get("d-node")) {
  customElements.define("d-node", DNode)
}
