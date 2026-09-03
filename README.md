# html-diagram

`html-diagram` is a way to make diagrams from ordinary HTML. Your diagram can be opened in a browser, styled with CSS, and saved as a standalone HTML file.

The project is at an early implementation stage. The two entrypoints below describe the intended experience and the markup the library is being built around.

## Choose Your Starting Point

### 1. Visual editor: design and product work

Use the visual editor when you want to make a diagram without writing code.

You will be able to:

1. Open the editor in a browser.
2. Add and arrange boxes, groups, and connections.
3. Put your own labels and HTML content inside each box.
4. Export the result as one standalone `.html` file.
5. Share or open that file in any modern browser.

**Requirements:** a modern web browser. No programming setup is needed.

The exported file is intended to be portable: it contains the diagram and its presentation in one place, so it can be shared as an attachment or kept with a project document.

### 2. Library import: developer work

Use the library when you want to place a diagram directly in an existing HTML page.

The intended workflow is:

1. Add the `html-diagram` package to your project.
2. Import it from your page or application.
3. Write the diagram as HTML.
4. Use normal HTML attributes and CSS classes to describe and style it.

```html
<script type="module">
  import "html-diagram"
</script>

<html-diagram layout="dagre" direction="LR" grid="20">
  <d-node id="start" dx="2" dy="4">Start here</d-node>
  <d-node id="finish" dx="14" dy="4">Finish here</d-node>
  <d-edge from="start" to="finish" label="Next"></d-edge>
</html-diagram>
```

**Requirements:** an HTML document and a browser that supports Web Components. The package and runtime API are still being developed, so this example shows the planned import and markup style.

## Examples

Build the usage example with Bun:

```bash
bun run build:examples
```

Then open `build/1.usage.html` in a browser. The generated file includes its bundled browser script, so it can be opened directly without a web server.

## Learn More

- [Design document](docs/html-diagram.md): vision, competitive landscape, element types, rendering layers, layout, styling, and the implementation roadmap.
- [MIT License](LICENSE)

## Project Status

The repository currently contains the design documentation, an initial Bun/TypeScript scaffold, and the first runtime foundation: `DiSchema` for property metadata and validation, and `DiElement` for declarative custom elements. Builtin diagram elements, the visual editor, and the exporter are planned next.
