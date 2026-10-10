# EarthLens — Full project codebase

This archive contains the source for the redesigned, published EarthLens application, including the browser interface, NASA refresh endpoints, statistical engine, bundled real NASA datasets, tests, lockfile, and deployment infrastructure.

## Run locally

Requirements: Node.js 22.13 or newer and pnpm 11.25.0 (the version pinned in package.json). Internet access is required to install dependencies and fetch fresh NASA data. NASA API keys are not required.

1. Extract this ZIP and open a terminal in the `earthlens` folder.
2. Install the locked dependencies:

   ```sh
   pnpm install --frozen-lockfile
   ```

3. Start development mode:

   ```sh
   pnpm dev
   ```

4. Open `http://localhost:5173`.

To build and run the compiled application locally:

```sh
pnpm build
pnpm start
```

Use the address printed by the start command. This is a Cloudflare Worker/Vinext application: opening index.html directly or using only a static file server does not provide the NASA API routes.

## Source map

- `public/index.html`, `public/styles.css`, `public/icons.js`: complete interface and original branding.
- `public/app.js`, `public/workspace.js`, `public/feeds.js`: analysis controls, imports/exports, saved projects, and NASA refresh workflows.
- `public/stats.js`: trend estimators, uncertainty, significance tests, and false discovery rate adjustment.
- `public/assets`: actual NASA POWER responses, annual series, GISTEMP CSV/provenance, and Natural Earth geometry.
- `frontend/index.html`: the HTML served by the server root route. Keep synchronized with `public/index.html` when changing markup.
- `server/nasa.mjs`: fixed NASA upstreams, complete-year/unit validation, timeouts, and cache fallback.
- `app/api/nasa`: the POWER and GISTEMP HTTP routes.
- `fetch_data.py`: reproducible scientific snapshot downloader.
- `tests`: statistical, CSV, UI/workspace, and NASA refresh regression checks.
- `build`, `scripts`, `vite.config.ts`: framework/Worker integration.
- `package.json`, `pnpm-lock.yaml`: reproducible dependency configuration.
- `README.md`: scientific methodology, provenance, refresh behavior, and limitations.

## Checks

The statistics, CSV, and NASA parser/endpoint tests use Node's standard library:

```sh
node tests/test-stats.cjs
node tests/test-import.cjs
node tests/test-nasa.mjs
```

The DOM workflow tests additionally require jsdom. Install it in your development environment or set `EARTHLENS_JSDOM_PATH` to its absolute module path, then run:

```sh
node tests/test-ui.cjs
node tests/test-workspace.cjs
node tests/test-feeds.cjs
```

The independent numerical reference check requires Python, NumPy, SciPy, and statsmodels:

```sh
python -m pip install numpy scipy statsmodels
python tests/reference-check.py
```

## Deployment and project identity

The included Sites/Cloudflare integration and `.openai/hosting.json` are the original application configuration. Publishing back to the existing Site requires authorized Sites tooling; no deployment credentials are included. For an independent hosting target, adapt the Worker deployment and identity integration rather than reusing the existing Site's project ID. The supplied source supports local development without NASA credentials.

Installed dependencies, Git history, generated builds, caches, and credentials are excluded. Recreate dependencies and builds using the commands above. This source export does not contain browser-local workspaces or user-imported research data; export those separately from the application.
