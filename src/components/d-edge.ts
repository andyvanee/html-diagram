import { DiElement, html, type DiTemplateResult } from "~/components/di-component.ts"
import { DiSchema, diBoolean, diEnum, diString } from "~/di-schema/di-schema.ts"

/** Describes the accepted properties for a diagram edge. */
export type DEdgeProperties = {
  from: string
  to: string
  label: string
  line: "straight" | "curved" | "orthogonal"
  animated: boolean
}

/** Describes an edge connector's SVG geometry. */
type DEdgeGeometry = {
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  height: number
}

/** Provides a declarative connection between diagram nodes or ports. */
export class DEdge extends DiElement<DEdgeProperties> {
  static override readonly schema = DiSchema.object({
    from: diString({ required: true }),
    to: diString({ required: true }),
    label: diString({ default: "" }),
    line: diEnum(["straight", "curved", "orthogonal"] as const, { default: "straight" }),
    animated: diBoolean({ default: false }),
  })

  /** Renders the edge metadata for the routing layer. */
  protected override render() {
    const { from, to, label, line, animated } = this.properties
    const geometry = this.getGeometry(from, to)
    return html`<style>
        :host {
          position: absolute;
          inset: 0;
          display: block;
          pointer-events: none;
          z-index: 0;
        }

        .edge-box {
          position: absolute;
          inset: 0;
        }

        .edge-label {
          position: absolute;
          left: ${geometry ? (geometry.startX + geometry.endX) / 2 : 0}px;
          top: ${geometry ? (geometry.startY + geometry.endY) / 2 - 6 : 0}px;
          transform: translate(-50%, -100%);
          color: #1e3a8a;
          font: 12px sans-serif;
          background: #ffffff;
          padding: 2px 4px;
          white-space: nowrap;
        }

        svg {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        line,
        path {
          fill: none;
          stroke: #2563eb;
          stroke-width: 2;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }

        marker path {
          fill: #2563eb;
          stroke: none;
        }
      </style>
      ${geometry ? this.renderConnector(geometry, line) : ""}
      <div
        class="edge-box"
        aria-label="${label}"
        data-from="${from}"
        data-to="${to}"
        data-line="${line}"
        data-animated="${animated}"
      >
        ${label ? html`<span class="edge-label">${label}</span>` : ""}
        <slot></slot>
      </div>`
  }

  /** Resolves endpoint elements and measures their connector geometry. */
  private getGeometry(from: string, to: string): DEdgeGeometry | undefined {
    const diagram = this.closest("html-diagram")
    if (!(diagram instanceof HTMLElement)) return undefined

    const start = findEndpoint(from, diagram)
    const end = findEndpoint(to, diagram)
    if (!start || !end) return undefined

    const diagramRect = diagram.getBoundingClientRect()
    const startRect = start.getBoundingClientRect()
    const endRect = end.getBoundingClientRect()
    const startCenter = {
      x: startRect.left + startRect.width / 2 - diagramRect.left,
      y: startRect.top + startRect.height / 2 - diagramRect.top,
    }
    const endCenter = {
      x: endRect.left + endRect.width / 2 - diagramRect.left,
      y: endRect.top + endRect.height / 2 - diagramRect.top,
    }
    const direction = {
      x: endCenter.x - startCenter.x,
      y: endCenter.y - startCenter.y,
    }
    const startPoint = getBorderPoint(startCenter, startRect, direction)
    const endPoint = getBorderPoint(endCenter, endRect, direction, true)
    return {
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
      width: Math.max(diagramRect.width, 1),
      height: Math.max(diagramRect.height, 1),
    }
  }

  /** Renders the SVG connector for the selected line style. */
  private renderConnector(
    geometry: DEdgeGeometry,
    line: DEdgeProperties["line"],
  ): DiTemplateResult {
    const connector = getConnectorMarkup(geometry, line)
    return html`<svg
      viewBox="0 0 ${geometry.width} ${geometry.height}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="edge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" />
        </marker>
      </defs>
      ${connector}
    </svg>`
  }
}

/** Finds where a center-to-center ray intersects an endpoint rectangle. */
function getBorderPoint(
  center: { x: number; y: number },
  rect: DOMRect,
  direction: { x: number; y: number },
  reverse = false,
): { x: number; y: number } {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  if (halfWidth === 0 || halfHeight === 0 || (direction.x === 0 && direction.y === 0)) {
    return center
  }

  const xRatio = Math.abs(direction.x) / halfWidth
  const yRatio = Math.abs(direction.y) / halfHeight
  const distance = 1 / Math.max(xRatio, yRatio)
  const sign = reverse ? -1 : 1
  return {
    x: center.x + direction.x * distance * sign,
    y: center.y + direction.y * distance * sign,
  }
}

/** Finds a node or port element referenced by an edge endpoint. */
function findEndpoint(reference: string, diagram: HTMLElement): HTMLElement | undefined {
  const [elementId, portId] = reference.split(":")
  const targetId = portId ?? elementId
  if (!targetId) return undefined
  const element = document.getElementById(targetId)
  return element instanceof HTMLElement && diagram.contains(element) ? element : undefined
}

/** Creates SVG connector markup for a line style. */
function getConnectorMarkup(
  geometry: DEdgeGeometry,
  line: DEdgeProperties["line"],
): DiTemplateResult {
  const { startX, startY, endX, endY } = geometry
  if (line === "curved") {
    const controlOffset = Math.max(Math.abs(endX - startX) / 2, 40)
    return html`<path
      marker-end="url(#edge-arrow)"
      d="M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX -
      controlOffset} ${endY}, ${endX} ${endY}"
    />`
  }
  if (line === "orthogonal") {
    const midpoint = (startX + endX) / 2
    return html`<path
      marker-end="url(#edge-arrow)"
      d="M ${startX} ${startY} H ${midpoint} V ${endY} H ${endX}"
    />`
  }
  return html`<line
    marker-end="url(#edge-arrow)"
    x1="${startX}"
    y1="${startY}"
    x2="${endX}"
    y2="${endY}"
  />`
}

if (!customElements.get("d-edge")) {
  customElements.define("d-edge", DEdge)
}
