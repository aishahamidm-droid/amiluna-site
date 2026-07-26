const mode3dButton = document.getElementById("mode-3d-btn");
const modeAiButton = document.getElementById("mode-ai-btn");
const galleryView = document.getElementById("view-3d-gallery");
const aiView = document.getElementById("view-ai-design");
const title = document.getElementById("experience-title");
const subtext = document.getElementById("experience-subtext");

function selectMode(mode) {
  const isAiMode = mode === "ai";

  if (galleryView) {
    galleryView.style.display = isAiMode ? "none" : "block";
  }

  if (aiView) {
    aiView.style.display = isAiMode ? "flex" : "none";
  }

  mode3dButton?.classList.toggle("active", !isAiMode);
  modeAiButton?.classList.toggle("active", isAiMode);
  mode3dButton?.setAttribute("aria-pressed", String(!isAiMode));
  modeAiButton?.setAttribute("aria-pressed", String(isAiMode));

  if (title) {
    title.textContent = isAiMode ? "AI Interior Designer" : "3D Gallery View";
  }

  if (subtext) {
    subtext.textContent = isAiMode
      ? "Choose an artwork and a setting to visualize it in your room."
      : "A guided cinematic walk through the room, moving across each artwork before returning to the center piece.";
  }

  if (!isAiMode) {
    window.dispatchEvent(new Event("resize"));
  }
}

mode3dButton?.addEventListener("click", () => selectMode("gallery"));
modeAiButton?.addEventListener("click", () => selectMode("ai"));

mode3dButton?.setAttribute("role", "button");
modeAiButton?.setAttribute("role", "button");
mode3dButton?.setAttribute("tabindex", "0");
modeAiButton?.setAttribute("tabindex", "0");

[mode3dButton, modeAiButton].forEach((button) => {
  button?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      button.click();
    }
  });
});
