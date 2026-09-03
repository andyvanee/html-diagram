import { DiElement, html } from "~/components/di-component.ts"
import { DiSchema, diBoolean, diEnum, diNumber } from "~/di-schema/di-schema.ts"

/** Describes the accepted properties for the diagram root. */
export type HtmlDiagramProperties = {
  layout: "manual" | "dagre" | "elkjs"
  direction: "LR" | "TB"
  interactive: boolean
  grid: number
}

/** Provides the root viewport for an HTML-native diagram. */
export class HtmlDiagram extends DiElement<HtmlDiagramProperties> {
  static override readonly schema = DiSchema.object({
    layout: diEnum(["manual", "dagre", "elkjs"] as const, { default: "manual" }),
    direction: diEnum(["LR", "TB"] as const, { default: "LR" }),
    interactive: diBoolean({ default: false }),
    grid: diNumber({ default: 20, min: 1 }),
  })

  private resizeObserver?: ResizeObserver

  /** Starts observing diagram dimensions and endpoint elements. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.resizeObserver = new ResizeObserver(() => this.requestEdgeUpdates())
    this.observeResizeTargets()
  }

  /** Stops observing diagram dimensions and endpoint elements. */
  disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined
  }

  /** Renders the diagram viewport and its slotted children. */
  protected override render() {
    const { direction, interactive, grid } = this.properties
    return html`<style>
        :host {
          display: block;
          position: relative;
          height: 100%;
          --di-grid-size: ${grid}px;
          min-height: 240px;
          overflow: hidden;
        }

        .viewport {
          position: relative;
          min-height: 240px;
          height: 100%;
          width: 100%;
          overflow: auto;
          user-select: ${interactive ? "auto" : "none"};
        }

        .canvas {
          position: relative;
          height: 100%;
          min-width: ${direction === "LR" ? "640px" : "100%"};
          min-height: 240px;
        }
      </style>
      <div
        class="viewport"
        data-direction="${direction}"
        data-grid="${grid}"
        data-interactive="${interactive}"
      >
        <div class="canvas"><slot></slot></div>
      </div>`
  }

  /** Observes the elements whose bounds determine edge geometry. */
  private observeResizeTargets(): void {
    if (!this.resizeObserver) return
    this.resizeObserver.observe(this)
    for (const element of Array.from(this.querySelectorAll<HTMLElement>("[id], d-node, d-edge"))) {
      this.resizeObserver.observe(element)
    }
  }

  /** Requests a rerender for every edge in the diagram. */
  private requestEdgeUpdates(): void {
    for (const edge of Array.from(this.querySelectorAll<HTMLElement>("d-edge"))) {
      const updateableEdge = edge as HTMLElement & { requestUpdate: () => void }
      updateableEdge.requestUpdate()
    }
  }
}

if (!customElements.get("html-diagram")) {
  customElements.define("html-diagram", HtmlDiagram)
}
