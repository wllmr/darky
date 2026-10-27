(() => {
  const THEME_ATTRIBUTES = ['data-theme-mode', 'data-color-mode', 'data-theme'];
  const TRANSPARENT_ALPHA = /^rgba\([^)]*,\s*0(?:\.0*)?\s*\)$|\/\s*0(?:\.0*)?\s*\)$/;

  function isTransparent(color) {
    return color === 'transparent' || TRANSPARENT_ALPHA.test(color);
  }

  function isDarkColor([red, green, blue]) {
    return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128;
  }

  function createDetector(stylesheet) {
    const sampledElements = new Set();
    let colorContext;

    function parseColor(color) {
      if (isTransparent(color)) return [0, 0, 0, 0];
      if (/^rgba?\(/.test(color)) {
        const values = color.match(/[\d.]+/g).map(Number);
        return [...values.slice(0, 3), values[3] ?? 1];
      }
      // Canvas converts modern CSS colors such as oklch and display-p3 to sRGB.
      colorContext ??= document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
      if (!colorContext) return [255, 255, 255, 1];
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = color;
      colorContext.fillRect(0, 0, 1, 1);
      const values = Array.from(colorContext.getImageData(0, 0, 1, 1).data);
      return [...values.slice(0, 3), values[3] / 255];
    }

    function sampleViewportLayers() {
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      if (!width || !height) return [[document.body, document.documentElement].filter(Boolean)];
      const samples = [];
      for (const x of [0.2, 0.5, 0.8]) {
        for (const y of [0.25, 0.5, 0.75]) {
          samples.push(document.elementsFromPoint(width * x, height * y));
        }
      }
      return samples;
    }

    function trackAncestors(layers) {
      // Theme selectors may live above an opaque child. Keep those ancestors
      // even when color compositing stops at the child itself.
      for (const layer of layers) {
        let ancestor = layer;
        while (ancestor && !sampledElements.has(ancestor)) {
          sampledElements.add(ancestor);
          ancestor = ancestor.parentElement;
        }
      }
    }

    function compositeBackground(layers, colors) {
      let remainingOpacity = 1;
      const pixel = [0, 0, 0];
      for (const element of layers) {
        if (!colors.has(element))
          colors.set(element, parseColor(getComputedStyle(element).backgroundColor));
        const color = colors.get(element);
        for (let channel = 0; channel < 3; channel++) {
          pixel[channel] += color[channel] * color[3] * remainingOpacity;
        }
        remainingOpacity *= 1 - color[3];
        if (remainingOpacity < 0.01) break;
      }
      // Fully transparent documents expose the browser's white canvas.
      return pixel.map((channel) => channel + 255 * remainingOpacity);
    }

    function readDeclaredTheme() {
      // Whole-app declarations are stronger than a white email/document pane.
      // Only exact modes count; names such as "carbon" and "auto" are ambiguous.
      for (const element of [document.documentElement, document.body].filter(Boolean)) {
        for (const attribute of THEME_ATTRIBUTES) {
          const mode = element.getAttribute(attribute)?.trim().toLowerCase();
          if (mode === 'dark') return true;
          if (mode === 'light') return false;
        }
      }
      // Body inherits the root scheme unless it overrides it. Read its
      // effective value so a body override is not masked by the root's value.
      const schemeElement = document.body ?? document.documentElement;
      const schemes = (getComputedStyle(schemeElement).colorScheme ?? '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((value) => value !== 'only');
      // "light dark" declares support for both, not the active theme.
      if (schemes.length === 1 && schemes[0] === 'dark') return true;
      if (schemes.length === 1 && schemes[0] === 'light') return false;
      return null;
    }

    function isDark() {
      if (!document.documentElement) return false;
      sampledElements.clear();
      const declaredTheme = readDeclaredTheme();
      if (declaredTheme !== null) return declaredTheme;
      stylesheet.disabled = true;
      try {
        const samples = sampleViewportLayers();
        const colors = new Map();
        let darkSamples = 0;
        for (const layers of samples) {
          trackAncestors(layers);
          if (isDarkColor(compositeBackground(layers, colors))) darkSamples++;
        }
        return darkSamples > samples.length / 2;
      } finally {
        stylesheet.disabled = false;
      }
    }

    function usesElement(element) {
      return sampledElements.has(element);
    }
    return { isDark, usesElement };
  }

  globalThis.DarkyThemeDetection = { createDetector, isTransparent, THEME_ATTRIBUTES };
})();
