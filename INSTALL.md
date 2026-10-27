# Install Darky

Darky supports desktop Chromium browsers such as Chrome, Edge, Brave, and Chromium. Installing from GitHub uses the browser's **Developer mode** and **Load unpacked** controls. There is no installer executable and no build tools are needed for a release ZIP.

## Download and install a release

1. Open [Darky's GitHub Releases](https://github.com/wllmr/darky/releases/latest).
2. Under **Assets**, download **darky.zip**. Choose this file rather than GitHub's automatically generated “Source code” archives. If no release is published yet, use the source-install instructions below.
3. Extract the ZIP into a permanent folder, for example `Documents/Darky`. Extract it before loading it; do not select the ZIP itself.
4. Open your browser's extensions page:

   | Browser           | Extensions page       |
   | ----------------- | --------------------- |
   | Chrome / Chromium | `chrome://extensions` |
   | Microsoft Edge    | `edge://extensions`   |
   | Brave             | `brave://extensions`  |

5. Turn on **Developer mode**.
6. Click **Load unpacked** and select the extracted folder containing **manifest.json**. Select that folder, not its `src` subfolder. If extraction created an extra outer folder, open it until you find `manifest.json`.
7. Pin Darky from the browser's extensions menu, then open a normal website. Refresh tabs that were already open once after installation.

Keep the extracted folder in place: the browser loads the extension files from there. Settings are saved locally. Browser-internal pages, extension stores, and built-in PDF viewers cannot be themed.

## Install directly from GitHub source

No compilation, Node.js, Python, or npm installation is needed to run the source.

1. On the [repository page](https://github.com/wllmr/darky), choose **Code → Download ZIP**, or clone the repository.
2. Extract the source archive if you downloaded one.
3. Follow steps 4–7 above, selecting the repository folder containing `manifest.json`.

The source archive contains developer files as well as the runtime extension. The prepared release ZIP is smaller and is the preferred end-user download.

## Update without losing settings

GitHub-installed unpacked extensions do not update automatically.

1. Download the new release ZIP.
2. Extract its files into the **same folder you originally loaded**, replacing the old files. Keep `manifest.json` at that folder's root.
3. Open the extensions page and click **Reload** on Darky's card.
4. Refresh open websites once to replace their old content scripts.

Keep the same loaded folder and browser profile to preserve the unpacked extension's identity and local settings. Avoid removing the extension and adding it again just to update it. If you installed from a Git clone, pull updates into the same checkout instead.

Normal **On / Paused** changes in Darky's popup apply immediately; they do not require reloading the page.

## Verify the download (optional)

Each prepared release includes **SHA256SUMS** alongside **darky.zip**. Download both into the same folder.

Linux:

```sh
sha256sum --check SHA256SUMS
```

macOS:

```sh
shasum -a 256 --check SHA256SUMS
```

Windows PowerShell:

```powershell
Get-FileHash .\darky.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Compare the ZIP's SHA-256 value with the value in `SHA256SUMS` (case does not matter). This checks the downloaded file against the checksum provided with that release.

## Troubleshooting

- **“Manifest file is missing or unreadable”:** extract the ZIP and select the folder containing `manifest.json`, not the ZIP or `src` folder.
- **No effect on a website:** keep Darky On, check the site's appearance override, allow the browser's site access for that website, and refresh once after installing/updating the extension. An already-matching native theme may need no conversion; the popup explains its current status.
- **The browser says the extension is unsupported or blocked:** confirm that you are using a desktop Chromium browser with Developer mode available. Work/school policies may restrict unpacked extensions.
- **I want one-click installation or automatic updates:** this GitHub distribution uses manual unpacked installation. Those features require a separate browser-store distribution; no store listing is currently configured here.

See Chrome's [unpacked extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) and [distribution guide](https://developer.chrome.com/docs/extensions/how-to/distribute) for the browser's installation rules.
