# FailureAtlas Firefox Extension (v1.0.2) — Source Code & Build Instructions

This package contains the complete, unminified, original source code, configuration files, and assets required to reproduce the exact `failureatlas-extension-v1.0.2.zip` extension artifact submitted to Mozilla Add-ons (AMO).

---

## 1. Environment Requirements

- **Operating System:** Linux, macOS, or Windows
- **Node.js:** Node.js `>= 18.0.0` (tested on Node.js `v20.20.2` LTS)
- **Package Manager:** `npm` `>= 9.0.0` (tested on npm `10.8.2`)
- **Python (for packaging script):** Python `>= 3.8` (standard built-in `zipfile` module, zero external python dependencies)

---

## 2. Dependencies & Tooling

The extension uses the following build toolchain:
- **Bundler:** `webpack` (v5.107.2) & `webpack-cli` (v5.1.4)
- **Transpiler:** `typescript` (v5.7.3) with `ts-loader` (v9.5.2)
- **Minifier / Optimizer:** Webpack built-in production Terser optimization (`--mode production`)
- **HTML & Asset Plugins:** `html-webpack-plugin` (v5.6.3), `copy-webpack-plugin` (v11.0.0)

All dependencies and exact versions are locked in [`package-lock.json`](./package-lock.json).

---

## 3. Step-by-Step Reproduction Instructions

### Step 1: Install Dependencies
From this directory, run:
```bash
npm ci
```
*(or `npm install` if preferred)*

### Step 2: Build the Extension
Execute the production build:
```bash
npm run build
```
This runs:
```bash
webpack --config webpack.config.js --mode production
```

### Step 3: Output Directory
The build outputs all compiled files, HTML, CSS, manifest, and icons directly into the `./dist/` directory:
- `dist/manifest.json` (Extension manifest)
- `dist/background.js` (Compiled background script)
- `dist/content.js` (Compiled content script)
- `dist/popup.html` (Popup UI)
- `dist/popup.css` (Popup stylesheet)
- `dist/popup.js` (Compiled popup script)
- `dist/icons/` (`icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`)

### Step 4: Package the Final Extension ZIP
To generate the exact distribution archive with standard forward-slash (`/`) paths (RFC 1951):
```bash
npm run package
```
*(or directly `python package.py`)*

This produces:
```bash
failureatlas-extension-v1.0.2.zip
```
in the project directory.

---

## 4. Verification

To verify the generated extension package using Mozilla's official linter:
```bash
npx addons-linter failureatlas-extension-v1.0.2.zip
```
Validation should complete with `errors: 0`.

---

## 5. File Structure of this Source Package

```
.
├── icons/                 # Original icon assets (PNG & SVG)
├── src/                   # Original uncompiled TypeScript source files
│   ├── background.ts      # Background event handler, auth, and API client
│   ├── content.ts         # LeetCode DOM extractor and submission listener
│   ├── popup.ts           # Extension popup UI logic
│   └── types.ts           # Shared TypeScript interfaces & types
├── jest.config.js         # Jest test configuration
├── manifest.json          # WebExtension Manifest V3
├── package.json           # npm configuration & build scripts
├── package-lock.json      # Locked npm dependency tree
├── package.py             # Packaging script (cross-platform, forward-slash paths)
├── popup.css              # Popup styling
├── popup.html             # Popup HTML template
├── README.md              # Build and reproduction instructions (this file)
└── tsconfig.json          # TypeScript compiler configuration
```
