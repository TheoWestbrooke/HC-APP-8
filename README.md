# HC Debt Model Web App

This folder contains a responsive static web app generated from `HC Debt Only Model.xlsx`. It has no server-side dependency: open `index.html` locally, or host the folder on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static hosting provider.

## Files

- `index.html` - single-page app shell
- `style.css` - responsive styling for desktop and phone
- `model.js` - workbook values and formula engine converted from the Excel model
- `app.js` - UI, scenario links, CSV export, and Excel model export
- `jszip.min.js` - browser ZIP library used to produce the Excel workbook download
- `manifest.webmanifest` - installable/PWA metadata
- `sw.js` and `icons/` - offline/PWA support for phones
- `assets/HC Debt Only Model.xlsx` - original workbook template used by the Excel export

## Exports

The app has two export buttons:

- **Export CSV** downloads a flat output snapshot for quick analysis.
- **Export Excel** downloads a full `.xlsx` copy of the original model, with the current app scenario written back into the model input cells. The workbook keeps the original sheets, formatting, formulas, and output structure. Excel is instructed to recalculate the workbook when it opens.

## Hosting

For GitHub Pages, commit the contents of this folder to the repository root and enable Pages from Settings -> Pages -> Deploy from a branch -> `main` -> `/ (root)`.

After replacing files in an existing GitHub Pages deployment, hard-refresh the hosted page or open it with a cache-busting query string such as `?v=3`.

## Notes

The browser app reproduces the key Capital Inputs, Debt Model, and Output dashboard calculations. The Excel export is generated from the original workbook template in `assets/`, so do not delete or rename `assets/HC Debt Only Model.xlsx`.

## Recent UI updates

- Dashboard KPI cards now display, left to right: WDO Gross IRR, Net WDO IRR, WDO net MoM, Global x EBITDA, DSCR Year 1, Contractual IRR.
- The Reset button now zeroes the Structuring & valuation, Tranche 1, Tranche 2, Tranche 3, Upside, and RMB / FinCo sections only.
- Project & timing and WAAM fees are preserved when Reset is clicked.
- The Upside / warrants section has been renamed to Upside.

## Feature update

This version adds front-end usability features only. The underlying model values, formulas and calculations are unchanged.

Implemented:
- Sticky KPI area on dashboard
- Undo / redo for input changes
- Improved responsive dashboard controls
- KPI sparklines
- Covenant-style warning banner
- Scenario summary export
- Timestamped export filenames for new summary exports
- Investment Committee summary panel and export
- Sensitivity matrix using temporary front-end input flexes, then restoring the current scenario
- Improved table readability
- Branded loading screen using the app logo

## Analysis and defaults update

- Removed the Investment Committee Summary section.
- Added a new Analysis tab.
- Moved Sensitivity Matrix into the Analysis tab.
- Sensitivity now shows WDO Gross IRR versus exit multiple at -1.0x, -0.5x, base, +0.5x and +1.0x.
- Reset now restores the requested app default inputs rather than workbook defaults.
- First open uses the requested app default inputs unless a saved/hash scenario is present.
- Removed the Tranche 1 sculpted amortisation input from the UI.
- Renamed RMB Label to 3rd Party.

## Percent restore hotfix

Fixed a front-end restore issue where raw percentage model values were incorrectly parsed as display percentages during default restore, undo/redo and sensitivity restore. This does not change the financial calculations.

## Sensitivity output fix

The Analysis sensitivity matrix now evaluates each exit multiple case in an isolated copy of the current model inputs and reads WDO Gross IRR from that case. It also resets stale browser state once for this version so old cached/corrupted inputs do not force zero outputs.

## Indicative Term Sheet export

Added an Export Term Sheet button next to Export Excel. The export uses `assets/Indicative Term Sheet.pptx` as the PowerPoint template, replaces `[Insert]` with the current project name, and populates an indicative LMA-style term sheet from the current structuring EBITDA, investment term and tranche/RMB pricing inputs.

## Term sheet export refinement

The Export Term Sheet feature now covers structuring metrics and tranche inputs only. RMB / FinCo terms are excluded from the exported term sheet. Non-model-driven areas are left as yellow highlighted "To be updated" placeholders. Amortisation is populated from the tranche amortisation inputs in the app.

## Word term sheet export

The Export Term Sheet button now generates a `.docx` from `assets/Indicative Term Sheet Template.docx` rather than a PowerPoint. It updates the project name/date and fills structuring and tranche-driven terms from current model inputs. Non-input-driven template text is highlighted yellow for review.

## Term sheet export button fix

Fixed the Export Term Sheet button binding and renamed the Word template asset to `assets/term-sheet-template.docx` to avoid GitHub Pages fetch issues with spaces in filenames.
