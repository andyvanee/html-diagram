# **HTML-Native Diagram Component Library (\<html-diagram\>) Design Document**

**Status:** Proposed **Author:** Software Engineering / Architecture **Target:** Web Standards Framework-Agnostic Component Library

## **1\. Executive Summary & Vision**

The \<html-diagram\> library is a declarative, HTML-native diagramming framework built entirely on Web Components (Custom Elements) and modern browser standards.  
While existing solutions rely on strict domain-specific languages compiling to static SVGs (Mermaid, D2) or framework-bound ecosystems (React Flow), \<html-diagram\> bridges the gap by making the **DOM itself the primary model and runtime layer**. Nodes accept arbitrary HTML/CSS light-DOM content, while edges, ports, and groups are managed via declarative tags. The architecture is explicitly designed for dual-use: clean hand-authored markup and bi-directional compatibility with future WYSIWYG diagram editors.

## **2\. Competitive Landscape & Core Differentiation**

The competitive landscape divides into two broad categories:

- **Static SVG DSLs (Mermaid, D2):** Excellent textual authoring and straightforward static compilation, but no native HTML composition.
- **Framework flow libraries (React Flow, Vue Flow):** Rich HTML node content, but they are bound to JavaScript frameworks and require code-heavy initialization.

The proposed `<html-diagram>` component combines the useful parts of both approaches:

- Framework-agnostic Web Components
- Arbitrary HTML light-DOM content
- Declarative markup API
- Bi-directional WYSIWYG-ready state

| Metric / Capability        | Mermaid / D2              | React / Vue Flow          | JointJS / GoJS          | \<html-diagram\> (Proposed)         |
| :------------------------- | :------------------------ | :------------------------ | :---------------------- | :---------------------------------- |
| **Authoring Paradigm**     | Text DSL                  | JSX / State Arrays        | JS API Configuration    | **Declarative Custom Elements**     |
| **Node Content**           | Fixed SVG Shapes          | React/Vue Components      | SVG \<foreignObject\>   | **Native Standard HTML Light DOM**  |
| **Runtime Dependencies**   | Monolithic Compiler       | Framework Runtime         | Heavy Canvas/SVG Engine | **Zero (Native Web Standards)**     |
| **Styling & Theming**      | DSL Config / Injected CSS | CSS-in-JS / Tailwind      | Imperative Theme APIs   | **CSS Custom Properties & Classes** |
| **Bi-Directional Editing** | ❌ Text-to-SVG only       | ✅ Custom implementations | ✅ Canvas interactivity | ✅ **DOM-Attribute-backed State**   |

## **3\. Element Taxonomy & Markup Specification**

The library introduces five distinct element types to support rich architectural, flow, and sequence diagrams.

```html
<html-diagram class="theme-dark" layout="dagre" direction="LR" grid="20" interactive>
  <!-- Annotations / watermarks -->
  <d-watermark>SYSTEM ARCHITECTURE v2</d-watermark>
  <d-annotation x="520" y="80">Primary ingress cluster</d-annotation>

  <!-- Structural container group -->
  <d-group id="cluster-aws" label="AWS Cloud Region" x="40" y="40" width="600" height="400">
    <!-- Rich HTML node with connection ports -->
    <d-node id="api-gateway" type="service" dx="4" dy="6" dw="12" dh="8">
      <d-port id="p-out" side="right"></d-port>
      <div class="card">
        <img src="/icons/gateway.svg" alt="" />
        <div>
          <h4>API Gateway</h4>
          <span class="badge status-ok">Active</span>
        </div>
      </div>
    </d-node>

    <!-- Subgraph element -->
    <d-subgraph id="auth-subsystem" label="Auth Service Cluster" x="320" y="100">
      <d-node id="auth-worker-1" dx="1" dy="2">Worker A</d-node>
      <d-node id="auth-worker-2" dx="1" dy="6">Worker B</d-node>
    </d-subgraph>
  </d-group>

  <!-- Node outside of group -->
  <d-node id="user-db" type="database" dx="36" dy="8" dw="10" dh="6">
    <d-port id="p-in" side="left"></d-port>
    <div class="card">
      <h4>User Database</h4>
      <code>PostgreSQL 16</code>
    </div>
  </d-node>

  <!-- Edge connections -->
  <d-edge
    from="api-gateway:p-out"
    to="user-db:p-in"
    label="gRPC / TLS 1.3"
    line="curved"
    animated
  ></d-edge>
</html-diagram>
```

### **Element Breakdown**

> 1. **\<html-diagram\>**: Top-level viewport. Handles coordinate transforms (pan/zoom), auto-layout execution, SVG overlay synchronization, and DOM mutation events.
> 2. **\<d-node\>**: Primary layout block. Operates as an absolute wrapper positioning any light-DOM children.
> 3. **\<d-group\> & \<d-subgraph\>**: Container blocks that cluster related nodes into visual sub-networks or collapsible boundaries.
> 4. **\<d-swimlane\> & \<d-pool\>**: Row/column structural wrappers for temporal sequences and state machines.
> 5. **\<d-port\>**: Explicit edge attachment anchors positioned on node edges.
> 6. **\<d-edge\>**: Connector rendering paths between nodes or specific ports.
> 7. **\<d-annotation\> & \<d-watermark\>**: Contextual notes and background layers.

### **Grid Coordinates and Dimensions**

`<html-diagram>` uses a configurable 20px grid by default. Nodes can use grid units with shorthand attributes:

- `dx="0"` maps to `x="0"`.
- `dy="4"` maps to `y="80"`.
- `dw="2"` maps to `width="40"`.
- `dh="3"` maps to `height="60"`.

Explicit pixel attributes take precedence when both forms are present. For example, `x="10" dx="4"` uses `x="10"`. Set `grid="10"` on `<html-diagram>` to use a 10px grid instead.

## **4\. Dual-Layer Rendering Engine Architecture**

`<html-diagram>` isolates structural HTML node rendering from connection routing using a Shadow DOM dual-layer strategy.

```text
<html-diagram> (Host Element)
└── Shadow Root
  ├── Layer 0: <svg class="grid-watermark-layer">
  ├── Layer 1: <svg class="edge-layer">
  │   ├── <path class="d-edge-path" d="M 120 40 C..." />
  │   └── <marker id="arrow">...</marker>
  └── Layer 2: <div class="node-layer">
    └── <slot></slot> <!-- Light DOM nodes and containers -->
```

### **Layer Synchronization Protocol**

> 1. **Node Measurement:** A ResizeObserver tracks size and coordinate changes across all \<d-node\> and \<d-group\> elements.
> 2. **Path Geometry Calculation:** Edge paths (curved, orthogonal, or straight) are calculated using a Ray-AABB (Axis-Aligned Bounding Box) clipping algorithm to ensure connectors terminate at node borders or explicit \<d-port\> targets.
> 3. **Frame-Debounced Updates:** Path updates are batched into requestAnimationFrame render steps to eliminate layout thrashing and avoid ResizeObserver loop limit warnings.

## **5\. Layout Engine Strategy**

```text
<html-diagram> init
        |
Has manual x/y on all <d-node> elements?
        |
   +----+----+
  YES        NO
   |          |
Skip engine  Execute auto-layout
Render direct (Dagre / ElkJS worker)
                  |
                  v
       Write calculated x/y back
       as DOM attributes
```

> - **Manual Positioning:** If explicit x and y attributes exist on \<d-node\> elements, layout calculations are bypassed.
> - **Automated Graph Layout:** Integrated drivers (e.g., **Dagre** for layered graphs, **ElkJS** for nested block architectures) run asynchronously (preferably via Web Workers).
> - **DOM Synchronization:** Calculated layouts mutate the target \<d-node\> DOM attributes (x="240" y="120"), ensuring the raw HTML string remains a complete representation of the diagram state.

## **6\. CSS Theme & Visual Architecture**

The visual engine exposes design tokens via CSS Custom Properties, enabling global theme switching while allowing light-DOM overrides.

```css
/* Core structural design system */
:root {
  /* Canvas tokens */
  --d-bg-color: #0f172a;
  --d-grid-color: rgba(255, 255, 255, 0.05);
  --d-grid-size: 20px;

  /* Node tokens */
  --d-node-bg: #1e293b;
  --d-node-border: 1px solid #334155;
  --d-node-border-radius: 12px;
  --d-node-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);

  /* Edge tokens */
  --d-edge-color: #64748b;
  --d-edge-width: 2px;
  --d-edge-active-color: #38bdf8;

  /* Container tokens */
  --d-group-bg: rgba(30, 41, 59, 0.4);
  --d-group-border: 2px dashed #475569;
}

/* Light theme variant */
html-diagram.theme-light {
  --d-bg-color: #f8fafc;
  --d-grid-color: rgba(0, 0, 0, 0.06);
  --d-node-bg: #ffffff;
  --d-node-border: 1px solid #e2e8f0;
  --d-edge-color: #94a3b8;
  --d-group-bg: rgba(241, 245, 249, 0.7);
}

/* Host surface layout */
html-diagram {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--d-bg-color);
  background-image: radial-gradient(circle, var(--d-grid-color) 1px, transparent 1px);
  background-size: var(--d-grid-size) var(--d-grid-size);
  overflow: hidden;
  user-select: none;
}

/* Node styling */
d-node {
  position: absolute;
  display: inline-block;
  background: var(--d-node-bg);
  border: var(--d-node-border);
  border-radius: var(--d-node-border-radius);
  box-shadow: var(--d-node-shadow);
  box-sizing: border-box;
  z-index: 10;
}

d-node[selected] {
  outline: 2px solid var(--d-edge-active-color);
  outline-offset: 2px;
}
```

## **7\. WYSIWYG & Interactive UI Architecture**

To enable future drag-and-drop editing and live visual configuration:

> 1. **DOM as Single Source of Truth:** Direct interaction (e.g., dragging a node) mutates target element attributes (x, y). A MutationObserver triggers edge recalculation, eliminating state divergence.
> 2. **Event Model:** The root \<html-diagram\> element emits typed DOM events for host application integration:

- diagram-node-drag
- diagram-edge-connect
- diagram-selection-change
  > 3. **Interactive Control Overlays:** When interactive mode is enabled, dynamic handle elements (resize anchors, connector pins) attach directly to active nodes via Shadow DOM overlays.

## **8\. Implementation Roadmap**

### **Phase 1: Core Rendering Engine (MVP)**

> - Web Components initialization (\<html-diagram\>, \<d-node\>, \<d-edge\>).
> - SVG path generation engine for curved and orthogonal edge routing.
> - ResizeObserver edge sync pipeline.

### **Phase 2: Structural Elements & Theming**

> - Implementation of \<d-group\>, \<d-subgraph\>, and \<d-port\>.
> - Comprehensive CSS Custom Property theme system and dark/light preset tokens.

### **Phase 3: Layout Integration**

> - Integration of auto-layout drivers (Dagre / ElkJS).
> - Web Worker offloading for graph positioning.

### **Phase 4: Interactive Editing Engine**

> - Canvas pan and zoom transformation matrix support.
> - Drag-and-drop node positioning and visual edge connector authoring.
