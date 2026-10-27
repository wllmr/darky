# Chrome Web Store images

Upload the JPEG files directly to the corresponding fields in the store listing.

| File                            | Dimensions | Use                                      |
| ------------------------------- | ---------- | ---------------------------------------- |
| `01-appearance-1280x800.jpg`    | 1280 × 800 | Screenshot: appearance controls          |
| `02-native-themes-1280x800.jpg` | 1280 × 800 | Screenshot: native themes and brightness |
| `03-saved-sites-1280x800.jpg`   | 1280 × 800 | Screenshot: saved site preferences       |
| `small-promo-440x280.jpg`       | 440 × 280  | Small promotional tile                   |
| `marquee-promo-1400x560.jpg`    | 1400 × 560 | Marquee promotional tile                 |

Generated JPEGs, `assets.json`, and ZIP bundles are ignored by Git. The capture layouts and generator remain tracked.

The screenshots capture Darky’s actual popup and settings UI with example hostnames. The reading page is a fictional example rendered with Darky’s content scripts. The promotional tiles use the existing logo and vector artwork.

To regenerate after UI changes, install the development dependencies and Playwright Chromium, then run:

```sh
npm ci
npx playwright install chromium
npm run store:assets
```

The generator uses local files without external network requests. `example.html` and `layout.css` contain the capture layouts. `assets.json` lists the exported image dimensions.
