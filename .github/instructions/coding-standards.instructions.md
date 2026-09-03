---
description: Any time you generate code within this repo
# applyTo: 'typescript' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---

# Coding Standards

## Project Context

- This project is a dependency-light TypeScript library for HTML-native diagrams.
- Prefer browser standards and local abstractions over third-party dependencies.
- Components belong in `src/components` and are built as `HTMLElement` subclasses.
- Component schemas describe accepted properties and should remain available as runtime metadata for the visual editor and code hinting.

## Testing Requirements

- Use Bun's test runner with TypeScript test files.
- Every implementation file must have a colocated test file named `<filename>.test.ts`.
  - Example: `src/di-schema/di-schema.ts` is covered by `src/di-schema/di-schema.test.ts`.
- DOM and custom-element tests must use Bun's documented `happy-dom` setup:
  - Register `@happy-dom/global-registrator` from the project test preload file.
  - Configure the preload file in `bunfig.toml` under `[test]`.
  - Include `/// <reference lib="dom" />` in test files when needed for TypeScript DOM types.
- Each test file must cover at least:
  1.  Validation that the implementation can be instantiated or created successfully.
  2.  Validation of every meaningful branch, including valid and invalid schema/component paths.
  3.  Validation of accepted parameters, boundary values, and supported ranges.
- Tests should assert observable behavior and error details rather than private implementation details.
- Run the focused colocated tests and `bunx tsc --noEmit` after changes.

## Implementation Guidelines

- Keep APIs small, explicit, and dependency-free unless a dependency provides substantial value.
- Preserve strong TypeScript types and expose clear validation errors.
- Keep component updates deterministic and compatible with standard custom-element lifecycle methods.
- Avoid unrelated refactors when changing a component or its tests.

## Documentation Requirements

- Every function, method, class, type, and interface must include a docstring.
- Each docstring must describe the element's purpose in short, declarative language.
- Keep docstrings focused on behavior and intent; avoid repeating parameter or implementation details unless they clarify the public contract.

## Formatting Requirements

- Use the Prettier configuration in `package.json` as the formatting source of truth.
- Run Prettier on changed TypeScript, JSON, and supported project configuration files before validation.
- Use `bunx prettier --write` for formatting and `bunx prettier --check` to verify formatting.
- Do not manually override Prettier's configured style. `bunfig.toml` is excluded because Prettier does not provide a TOML parser.

## Rendering Requirements

- Prefer HTML elements for content, text, layout, and bounding boxes whenever an HTML equivalent exists.
- Use SVG only for accent elements that have no practical HTML equivalent, such as an arrow connector.
- For `d-edge`, keep the edge box, label, and metadata in HTML; use SVG only for the connector path or line and its arrow marker.
