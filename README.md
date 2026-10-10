# EarthLens — Earth Intelligence

A private NASA environmental-trend application with a Vinext server, refreshable official data sources, and browser-side statistical analysis. The full interface uses an original EarthLens identity, uniform SVG icons, light research cards, responsive horizontal navigation, and consistent report styling.

## Data and refresh

- NASA POWER / MERRA-2: air temperature at 2 m (°C), corrected mean daily precipitation (mm/day), relative humidity at 2 m (%), and wind at 10 m (m/s). The bundled download has 16 sampled coordinates with complete annual observations for 1981–2025.
- NASA GISTEMP v4: annual land–ocean anomalies in eight latitude bands, 1880–2025 in the bundled source, relative to 1951–1980.
- All built-in scientific values are actual NASA downloads. POWER values are model grid-cell samples; GISTEMP values are NASA analysis averages. Labels such as Central Amazon identify a sampled coordinate, not a whole-region average. Natural Earth geometry provides public-domain cartographic context.
- `GET /api/nasa/power?lat=23.8&lon=90.4` fetches a fixed official NASA POWER endpoint. `GET /api/nasa/gistemp` fetches the official NASA GISS table. No key or arbitrary proxy URL is accepted. End years are limited to the previous UTC calendar year, and each year must be complete. NASA publication delays can result in an earlier latest year.
- Refresh runs on opening a study and every 30 minutes while its browser tab is visible and Auto is enabled. Normal refresh can reuse a validated six-hour server cache. When the host denies shared cache access, a bounded cache in the server instance is used; it is ephemeral and a cache miss retrieves NASA directly. **Refresh NASA data** adds `refresh=1`, requests NASA directly, and bypasses that cache.
- Every source exposes its last successful fetch date, annual coverage, progress, and errors. Cached responses retain their original fetch timestamp. Partial or total NASA failures retain existing real records and are visibly labeled. The app does not claim real-time conditions.
- Add NASA location retrieves all four variables at entered coordinates (rounded to two decimals), with at most 40 study points. Saving a workspace preserves coordinate requests. Opening a project retrieves their NASA data; a device cache can restore previously validated records immediately.
- Source snapshots in `public/assets` provide an initial usable dataset. `data.json` and `gistemp-meta.json` record retrieval times and provenance; `power-*.json` and `gistemp-zonal.csv` preserve the downloaded NASA responses. `fetch_data.py` reproducibly refreshes both scientific snapshots. It does not alter Natural Earth geometry.

## Analysis and workspaces

The observatory includes a world trend map and table, location search/sorting, adjustable intervals, confidence thresholds, four-location comparisons with a common baseline, raw observation tables, provenance, and methods explanations. Available methods are linear trend with Newey–West HAC uncertainty (default), ordinary OLS with Student's t inference, and tie-corrected Mann–Kendall with Sen's slope. Benjamini–Hochberg q-values are computed across all eligible locations for the selected variable and interval.

Annual CSV import remains explicitly **user supplied and not independently verified**. Imports are processed locally, with quoting, duplicate, fill-value, coordinate, minimum-length, and spreadsheet formula-injection checks. Save workspace persists settings and imports on this browser/device; portable JSON projects, results CSV, observations CSV, vector charts, and standalone HTML reports are downloadable. There is no account-synchronized research database or closed-tab background update job.

## Statistics and limits

The centered linear fit is `y = mean(y) + slope × (year − mean(year))`. HAC uses Bartlett-weighted lagged score products, lag `floor(4(n/100)^(2/9))`, and scaling `n/(n−2)`. Two-sided p-values and pointwise mean-trend intervals use a normal approximation. OLS uses t with n−2 degrees of freedom. Location slope confidence limits are unadjusted; significant map markers require BH q ≤ α. Sen slopes have no supplied confidence interval. At least eight annual observations are required. Missing years are never interpolated; HAC lag positions follow successive valid observations and calendar gaps generate a caution. Spatial/temporal dependence can affect inference. Significance does not establish causality, practical importance, or future change.

## Build and verification

Keep the supplied Sites Vite/worker integration and manifest. Use the Sites installation/build helpers for this environment. `public` contains frontend assets, `frontend/index.html` is the server root HTML source, `app/api/nasa` exposes server routes, and `server/nasa.mjs` validates/caches upstream responses. Keep the two HTML source files synchronized when editing the interface.

Regression checks:

```sh
node tests/test-stats.cjs
node tests/test-import.cjs
node tests/test-nasa.mjs
node tests/test-ui.cjs
node tests/test-workspace.cjs
node tests/test-feeds.cjs
python tests/reference-check.py
```

DOM tests require jsdom (`EARTHLENS_JSDOM_PATH` accepts an external installation). The Python reference test requires SciPy and statsmodels. Tests cover real NASA fixtures, incomplete years, units, cache dates, manual refresh, source outages, added coordinates, persistence, navigation, charts, import/export, and statistical references. Browser visual QA is unavailable in the managed build environment.
