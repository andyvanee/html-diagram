import { DiElement, html } from "~/components/di-component.ts"
import { DiSchema, diBoolean, diNumber, diString } from "~/di-schema/di-schema.ts"

/** Describes the accepted properties for the diagram root. */
export type HtmlDiagramProperties = {
  title: string
  interactive: boolean
  grid: number
  padding: number
}

/** Provides the root viewport for an HTML-native diagram. */
export class HtmlDiagram extends DiElement<HtmlDiagramProperties> {
  static override readonly schema = DiSchema.object({
    title: diString({ default: "" }),
    interactive: diBoolean({ default: false }),
    grid: diNumber({ default: 20, min: 1 }),
    padding: diNumber({ default: 1, min: 0 }),
  })

  private resizeObserver?: ResizeObserver
  private mutationObserver?: MutationObserver

  /** Starts observing diagram dimensions and endpoint elements. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.resizeObserver = new ResizeObserver(() => {
      this.updateContentSize()
      this.requestEdgeUpdates()
    })
    this.mutationObserver = new MutationObserver(() => this.updateContentSize())
    this.mutationObserver.observe(this, {
      attributes: true,
      attributeFilter: ["x", "y", "dx", "dy", "width", "height", "dw", "dh", "grid", "padding"],
      characterData: true,
      childList: true,
      subtree: true,
    })
    this.observeResizeTargets()
    queueMicrotask(() => this.updateContentSize())
  }

  /** Stops observing diagram dimensions and endpoint elements. */
  disconnectedCallback(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined
    this.mutationObserver?.disconnect()
    this.mutationObserver = undefined
  }

  /** Rerenders positioned nodes when their diagram coordinate scale changes. */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    super.attributeChangedCallback(name, oldValue, newValue)
    if (name !== "grid" && name !== "padding") return
    for (const node of Array.from(this.querySelectorAll<HTMLElement>("d-node"))) {
      const updateableNode = node as HTMLElement & { requestUpdate?: () => void }
      updateableNode.requestUpdate?.()
    }
  }

  /** Renders the diagram viewport and its slotted children. */
  protected override render() {
    const { title, interactive, grid, padding } = this.properties
    return html`<style>
        :host {
          display: block;
          position: relative;
          height: 100%;
          --di-grid-size: ${grid}px;
          --di-padding-size: ${padding * grid}px;
          --di-content-height: 0px;
          --di-content-width: 0px;
          color: var(--di-text-color, CanvasText);
          min-height: var(--di-content-height);
          overflow: visible;
        }

        .viewport {
          position: relative;
          min-height: var(--di-content-height);
          height: 100%;
          width: 100%;
          overflow: auto;
          user-select: ${interactive ? "auto" : "none"};
        }

        .title {
          position: absolute;
          top: 0;
          left: var(--di-canvas-radius, var(--di-border-radius, 8px));
          transform: translateY(-50%);
          z-index: 2;
          color: var(--di-title-color, var(--di-text-color, CanvasText));
          background: var(--di-title-background, var(--di-background-color, Canvas));
          border-width: var(--di-title-border-width, var(--di-border-width, 1px));
          border-style: var(--di-title-border-style, var(--di-border-style, solid));
          border-color: var(--di-title-border-color, var(--di-border-color, currentColor));
          border-radius: var(--di-title-radius, var(--di-border-radius, 4px));
          padding: var(--di-title-padding, 6px 10px);
          font: var(--di-title-font, 600 14px/1.2 sans-serif);
        }

        .canvas {
          position: relative;
          height: 100%;
          min-width: max(100%, var(--di-content-width));
          min-height: var(--di-content-height);
        }
      </style>
      ${title ? html`<div class="title" part="title">${title}</div>` : ""}
      <div
        class="viewport"
        data-grid="${grid}"
        data-padding="${padding}"
        data-interactive="${interactive}"
      >
        <div class="canvas"><slot></slot></div>
      </div>`
  }

  /** Updates the minimum diagram dimensions to contain every rendered node and its padding. */
  private updateContentSize(): void {
    const diagramRect = this.getBoundingClientRect()
    const padding = this.properties.padding * this.properties.grid
    const contentBounds = Array.from(this.querySelectorAll<HTMLElement>("d-node")).reduce(
      (bounds, node) => {
        const nodeRect = node.getBoundingClientRect()
        return {
          right: Math.max(bounds.right, nodeRect.right - diagramRect.left),
          bottom: Math.max(bounds.bottom, nodeRect.bottom - diagramRect.top),
        }
      },
      { right: 0, bottom: 0 },
    )
    const contentHeight = contentBounds.bottom + padding
    const contentWidth = contentBounds.right + padding
    this.style.setProperty("--di-content-height", `${Math.ceil(contentHeight)}px`)
    this.style.setProperty("--di-content-width", `${Math.ceil(contentWidth)}px`)
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
      const updateableEdge = edge as HTMLElement & { requestUpdate?: () => void }
      updateableEdge.requestUpdate?.()
    }
  }
}

if (!customElements.get("html-diagram")) {
  customElements.define("html-diagram", HtmlDiagram)
}
