# Build Darky from source

You do **not** need to build Darky to install it. Use the [installation guide](../INSTALL.md) for a release ZIP or direct source installation.

The build command packages the existing extension files; it does not transpile, bundle, or minify them. Generated icons are already checked into the project.

## Requirements

- Node.js 22.13+ or a newer supported release, with npm. CI uses Node 24.
- Python 3.9+. CI uses Python 3.12.
- Git if cloning rather than downloading the source ZIP.

No npm dependencies need to be installed just to create the ZIP; the packager uses built-in Node/Python libraries. `npm ci` is required for development checks.

## Build

```sh
git clone https://github.com/wllmr/darky.git
cd darky
npm run build
```

The cross-platform launcher looks for a supported Python installation, including the Windows `py -3` launcher. It produces:

```text
dist/
  darky.zip       Ready to extract and load unpacked
  SHA256SUMS      SHA-256 checksum of darky.zip
```

`npm run package` is retained as an alias for `npm run build`.

To package without Node/npm, run the Python script directly from the repository root:

```sh
python3 scripts/package.py
```

On Windows, use `py -3 scripts/package.py` or `python scripts/package.py`, depending on how Python is installed.

The build validates the manifest's referenced assets, includes installation instructions and runtime files, and excludes developer files. ZIP entry timestamps and file modes are normalized so local metadata changes do not change the archive. Builds from different Python/zlib versions are not guaranteed to be byte-identical.

## Verify before sharing

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:all
npm run build
```

On Linux, browser tests require Chromium's system libraries and fonts. Playwright's `--with-deps` installation supports selected distributions; on Arch, install equivalent system dependencies separately. See [CONTRIBUTING.md](../CONTRIBUTING.md) for individual checks and code standards.

To verify that a release tag matches `manifest.json`:

```sh
npm run build -- --tag v0.4.4
```

Replace the example with `v` followed by the manifest's exact version. A mismatch fails the build before creating a new archive.

## Install your build

Extract `dist/darky.zip` to a permanent folder and follow [INSTALL.md](../INSTALL.md). Select the folder containing `manifest.json`, not the ZIP or its `src` subfolder. You can also load the repository root directly during development.

## Publish a GitHub download

Follow [the release guide](releasing.md). The workflow runs the full suite and prepares a draft release; a maintainer reviews and publishes it. Setting up the workflow locally does not upload files or publish a release.
