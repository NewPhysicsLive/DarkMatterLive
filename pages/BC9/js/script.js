/* script.js */

document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});

const X_MIN = 1e-30;
const X_MAX = 1e12;
const Y_MIN = 1e-30;
const Y_MAX = 1e-0;

const PLOT_TITLE = "\\mathrm{ALP\\,with\\,photon\\,dominance\\,(BC9)}";
const PLOT_X_TITLE = "\\mathrm{Mass\\,of\\,DM},\\,m_{a}\\,[\\mathrm{eV}]";
const PLOT_Y_TITLE = "\\mathrm{g_{a\\gamma\\gamma}\\,[GeV^{-1}]}";
const MODEL_NAME = "BC9"

/* plot releated sctipt located in pages/shared/plot.js */
