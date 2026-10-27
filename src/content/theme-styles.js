(() => {
  const FILTERED_LAYERS = 'html, :is(dialog:modal, :popover-open, :fullscreen)';
  const BACKDROP = ':is(dialog:modal, :popover-open, :fullscreen)::backdrop';
  const { isTransparent } = DarkyThemeDetection;

  function readCanvasBackground(stylesheet) {
    // The browser canvas is outside the root filter. Paint a transparent root
    // inside that filter so brightness also affects the page background.
    stylesheet.disabled = true;
    try {
      const rootColor = getComputedStyle(document.documentElement).backgroundColor;
      if (!isTransparent(rootColor)) return '';
      const bodyColor = document.body
        ? getComputedStyle(document.body).backgroundColor
        : 'transparent';
      return `html { background-color: ${isTransparent(bodyColor) ? '#fff' : bodyColor} !important; }`;
    } finally {
      stylesheet.disabled = false;
    }
  }

  function conversionCss(mode, brightness) {
    return `
      html { background: ${mode === 'light' ? '#000' : '#fff'} !important; min-height: 100%; }
      ${FILTERED_LAYERS} { filter: invert(1) hue-rotate(180deg) brightness(${brightness / 100}) !important; }
      img, video, canvas, svg image, [data-darky-preserve] { filter: invert(1) hue-rotate(180deg) !important; }
      :is(img, video, canvas, [data-darky-preserve]):is(:fullscreen, :popover-open) { filter: brightness(${brightness / 100}) !important; }
      ${BACKDROP} { filter: brightness(${brightness / 100}) !important; }
      ::selection { background: #b2a4ff !important; color: #111 !important; }
    `;
  }

  function apply(stylesheet, state) {
    if (!state.enabled || (!state.inverted && state.brightness === 100)) {
      stylesheet.remove();
      return;
    }
    // Top-layer dialogs, popovers and fullscreen content need their own filter.
    if (state.inverted) {
      stylesheet.textContent = conversionCss(state.mode, state.brightness);
    } else {
      const background = document.documentElement ? readCanvasBackground(stylesheet) : '';
      stylesheet.textContent = `${background}\n${FILTERED_LAYERS}, ${BACKDROP} { filter: brightness(${state.brightness / 100}) !important; }`;
    }
    if (!stylesheet.isConnected && document.documentElement)
      document.documentElement.append(stylesheet);
  }

  globalThis.DarkyThemeStyles = { apply };
})();
