document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});

const scene = document.getElementById("scene");
const parallaxInstance = new Parallax(scene, {
  relativeInput: true, // makes it follow the mouse
});

// Toggle list visibility with animation
const toggleBtn = document.getElementById("toggleTypesOfModelsBtn");
const list = document.getElementById("modelList");
toggleBtn.addEventListener("click", () => {
  list.classList.toggle("visible-model-list");
});

modelList.addEventListener("click", (e) => {
  if (e.target.matches(".model-button")) {
    const similarModels = e.target.nextElementSibling;
    if (similarModels && similarModels.matches(".similar-models")) {
      similarModels.classList.toggle("visible-similar-models");
    }
  }
});
