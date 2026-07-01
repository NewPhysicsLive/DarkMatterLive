document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});

const scene = document.getElementById("scene");
const parallaxInstance = new Parallax(scene, {
  relativeInput: true, // makes it follow the mouse
  pointerEvents: true,
  selector: ".layer-bg",
});

// Toggle list visibility with animation
const toggleBtn = document.getElementById("toggleTypesOfModelsBtn");
const list = document.getElementById("modelList");
toggleBtn.addEventListener("click", () => {
  const wasVisible = list.classList.contains("visible-model-list");
  list.classList.toggle("visible-model-list");
  // Do not auto-scroll; keep user in control to avoid header disappearing
});

list.addEventListener("click", (e) => {
  if (e.target.matches(".model-button")) {
    const similarModels = e.target.nextElementSibling;
    if (similarModels && similarModels.matches(".similar-models")) {
      const wasOpen = similarModels.classList.contains("visible-similar-models");
      similarModels.classList.toggle("visible-similar-models");
      // Avoid auto-scrolling sublists to keep page position stable
    }
  }
});
