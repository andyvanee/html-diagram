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

1. Add the `@andyvanee/html-diagram` package to your project.
2. Import it from your page or application.
3. Write the diagram as HTML.
4. Use normal HTML attributes and CSS classes to describe and style it.

```html
<script type="module">
  import "@andyvanee/html-diagram"
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

## Publishing

The repository has two GitHub Actions publishing paths:

- **Examples:** pushes to `main` build `examples/1.usage.html` and deploy it to [GitHub Pages](https://andyvanee.github.io/html-diagram/). Enable Pages for the repository with **GitHub Actions** as its source.
- **Library:** pushing a tag such as `v0.1.0` runs tests, builds the package, and publishes it to npm.

Before the first npm release, configure npm Trusted Publishing for `@andyvanee/html-diagram`:

1. Create the package on npm or publish the first version manually.
2. In the package settings, add a GitHub Actions trusted publisher.
3. Use `andyvanee` as the owner, `html-diagram` as the repository, and `publish.yml` as the workflow filename.
4. Publish a new version by pushing a matching Git tag, for example `v0.1.0`.

Once a version is published, it can be loaded from a browser with a pinned CDN URL:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@andyvanee/html-diagram@0.1.0/dist/index.js"
></script>
```

The equivalent UNPKG URL is `https://unpkg.com/@andyvanee/html-diagram@0.1.0/dist/index.js`. Use an exact version for stable, cacheable links. These CDN links are convenient for lightweight HTML pages; use `bun run build:examples` when the result must be a completely self-contained HTML file with no network dependency.

## Project Status

The repository currently contains the design documentation, builtin diagram elements, a Bun/TypeScript package build, and the first runtime foundation: `DiSchema` for property metadata and validation, and `DiElement` for declarative custom elements. The visual editor and exporter are planned next.
