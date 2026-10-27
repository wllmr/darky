# Prepare a GitHub release

The checked-in workflow is `.github/workflows/ci.yml`. It runs checks on pushes and pull requests, builds an artifact, and prepares a **draft** GitHub release for `v*` tags. It does not publish releases automatically.

## One-time repository setup

1. Commit and push the project, including the lockfile and `.github/` files, to [wllmr/darky](https://github.com/wllmr/darky).
2. Confirm that GitHub Actions is enabled for the repository and the first **Check and package** run succeeds.
3. The build job needs only `contents: read`; the draft-release job requests `contents: write` for its temporary `GITHUB_TOKEN`. No personal access token or custom secret is needed. An organization policy can still restrict these permissions.

Official GitHub actions are pinned to commit hashes. Review updates deliberately; the adjacent comments identify the versions checked when this workflow was added.

## Release a version

1. Update `manifest.json` to the intended version, finish tests, and commit the changes. Push the release commit to the default branch before tagging it.
2. Run the complete checks and local build:

   ```sh
   npm ci
   npx playwright install --with-deps chromium
   npm run test:all
   npm run build -- --tag v0.4.4
   ```

3. Create and push a matching tag. Replace `v0.4.4` below with `v` followed by the manifest version:

   ```sh
   git tag -a v0.4.4 -m "Darky v0.4.4"
   git push origin v0.4.4
   ```

4. Open the tag's **Check and package** run in GitHub Actions. It must finish successfully. A version mismatch or failed test prevents release preparation.
5. Open **Releases** and edit the generated draft. Confirm that **darky.zip** and **SHA256SUMS** are attached, add version-specific release notes, and test the ZIP with Load unpacked.
6. Click **Publish release** when ready. Mark prereleases appropriately rather than presenting them as stable downloads.

Rerunning the workflow may refresh assets on an existing **draft** release. It refuses to overwrite assets on a published release; fix problems with a new manifest version and tag.

## End-user download

Once a stable release is published, users can open:

- [Latest release](https://github.com/wllmr/darky/releases/latest)
- [Latest prepared ZIP](https://github.com/wllmr/darky/releases/latest/download/darky.zip)

Before the first published stable release, those links do not provide a release download. Users can still [install directly from source](../INSTALL.md#install-directly-from-github-source).

Choose the uploaded **darky.zip**, not GitHub's automatically generated source archives. A GitHub Actions artifact is primarily for testing; downloading it may add an outer artifact ZIP that contains darky.zip and SHA256SUMS.

GitHub installation requires manual unpacked loading and manual updates. Browser-store distribution is a separate future process.
