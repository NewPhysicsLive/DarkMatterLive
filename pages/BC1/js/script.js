/* script.js */

document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});

const X_MIN = 1e-32;
const X_MAX = 1e3;
const Y_MIN = 1e-30;
const Y_MAX = 1e0;

// KaTeX shall be used in plot titles
const PLOT_TITLE = "\\mathrm{Minimal\\,dark\\,photon\\,model\\,(BC1)}";
const PLOT_X_TITLE = "\\mathrm{Mass\\,of\\,DM},\\,m_{\\chi}\\,[\\mathrm{GeV}]";
const PLOT_Y_TITLE = "\\varepsilon";
const MODEL_NAME = "BC1" // used to determine /deta/BCx subdirectory from which curves will be loaded

// plot releated sctipt located in pages/shared/plot.js
