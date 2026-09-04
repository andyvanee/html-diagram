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
  startCenter: DEdgePoint
  startX: number
  startY: number
  startNormal: DEdgePoint
  endCenter: DEdgePoint
  endX: number
  endY: number
  endNormal: DEdgePoint
  width: number
  height: number
}

/** Represents a point in edge-local SVG coordinates. */
type DEdgePoint = { x: number; y: number }

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
    const labelPosition = geometry ? getLabelPosition(geometry, line) : { x: 0, y: 0 }
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
          left: ${labelPosition.x}px;
          top: ${labelPosition.y}px;
          transform: translate(-50%, -50%);
          color: var(--di-edge-label-color, var(--di-text-color, #1e3a8a));
          font: 12px sans-serif;
          background: var(--di-edge-label-background, var(--di-background-color, #ffffff));
          border-radius: var(--di-edge-label-radius, var(--di-border-radius, 0));
          padding: var(--di-edge-label-padding, 2px 4px);
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
          stroke: var(--di-edge-color, var(--di-theme-primary-color, #2563eb));
          stroke-width: var(--di-edge-width, var(--di-theme-line-width, 2px));
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }

        marker path {
          fill: var(--di-edge-color, var(--di-theme-primary-color, #2563eb));
          stroke: none;
        }
      </style>
      ${geometry ? this.renderConnector(geometry, line) : ""}
      <div
        class="edge-box"
        part="edge-box"
        aria-label="${label}"
        data-from="${from}"
        data-to="${to}"
        data-line="${line}"
        data-animated="${animated}"
      >
        ${label ? html`<span class="edge-label" part="edge-label">${label}</span>` : ""}
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

    const edgeRect = this.getBoundingClientRect()
    const startRect = start.getBoundingClientRect()
    const endRect = end.getBoundingClientRect()
    const startCenter = {
      x: startRect.left + startRect.width / 2 - edgeRect.left,
      y: startRect.top + startRect.height / 2 - edgeRect.top,
    }
    const endCenter = {
      x: endRect.left + endRect.width / 2 - edgeRect.left,
      y: endRect.top + endRect.height / 2 - edgeRect.top,
    }
    const direction = {
      x: endCenter.x - startCenter.x,
      y: endCenter.y - startCenter.y,
    }
    const startPoint = getBorderPoint(startCenter, startRect, direction)
    const endPoint = getBorderPoint(endCenter, endRect, direction, true)
    const startNormal = getBorderNormal(startRect, direction)
    const endNormal = getBorderNormal(endRect, direction, true)
    return {
      startCenter,
      startX: startPoint.x,
      startY: startPoint.y,
      startNormal,
      endCenter,
      endX: endPoint.x,
      endY: endPoint.y,
      endNormal,
      width: Math.max(edgeRect.width, 1),
      height: Math.max(edgeRect.height, 1),
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
    const { startControl, endControl } = getCurveControls(geometry)
    return html`<path
      part="edge-line"
      marker-end="url(#edge-arrow)"
      d="M ${startX} ${startY} C ${startControl.x} ${startControl.y}, ${endControl.x}
      ${endControl.y}, ${endX} ${endY}"
    />`
  }
  if (line === "orthogonal") {
    const midpoint = (startX + endX) / 2
    return html`<path
      part="edge-line"
      marker-end="url(#edge-arrow)"
      d="M ${startX} ${startY} H ${midpoint} V ${endY} H ${endX}"
    />`
  }
  return html`<line
    part="edge-line"
    marker-end="url(#edge-arrow)"
    x1="${startX}"
    y1="${startY}"
    x2="${endX}"
    y2="${endY}"
  />`
}

/** Calculates control points that bend a curve toward its destination. */
function getCurveControls(geometry: DEdgeGeometry): {
  startControl: DEdgePoint
  endControl: DEdgePoint
} {
  const { startX, startY, endX, endY, startNormal, endNormal } = geometry
  const controlOffset = Math.max(Math.hypot(endX - startX, endY - startY) / 2, 40)
  return {
    startControl: {
      x: startX + startNormal.x * controlOffset,
      y: startY + startNormal.y * controlOffset,
    },
    endControl: {
      x: endX + endNormal.x * controlOffset,
      y: endY + endNormal.y * controlOffset,
    },
  }
}

/** Finds the outward normal of the rectangle edge reached by a connector. */
function getBorderNormal(rect: DOMRect, direction: DEdgePoint, reverse = false): DEdgePoint {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  if (halfWidth === 0 || halfHeight === 0 || (direction.x === 0 && direction.y === 0)) {
    return { x: 0, y: 0 }
  }

  const xRatio = Math.abs(direction.x) / halfWidth
  const yRatio = Math.abs(direction.y) / halfHeight
  const sign = reverse ? -1 : 1
  if (xRatio > yRatio) return { x: Math.sign(direction.x) * sign, y: 0 }
  return { x: 0, y: Math.sign(direction.y) * sign }
}

/** Finds the midpoint of the rendered connector for label placement. */
function getLabelPosition(geometry: DEdgeGeometry, line: DEdgeProperties["line"]): DEdgePoint {
  if (line !== "curved") {
    return {
      x: (geometry.startX + geometry.endX) / 2,
      y: (geometry.startY + geometry.endY) / 2,
    }
  }

  const { startControl, endControl } = getCurveControls(geometry)
  return {
    x:
      geometry.startX * 0.125 +
      startControl.x * 0.375 +
      endControl.x * 0.375 +
      geometry.endX * 0.125,
    y:
      geometry.startY * 0.125 +
      startControl.y * 0.375 +
      endControl.y * 0.375 +
      geometry.endY * 0.125,
  }
}

if (!customElements.get("d-edge")) {
  customElements.define("d-edge", DEdge)
}
