import { buildFunctionUrl, buildPublicAssetUrl } from "./site-runtime.js";

const artworks = [
  { id: "AAA7", title: "AmiLuna Botanical I", src: "artworks/AAA7.jpg" },
  { id: "AAA4", title: "AmiLuna Botanical II", src: "artworks/AAA4.jpg" },
  { id: "AAA6", title: "AmiLuna Botanical III", src: "artworks/AAA6.jpg" },
  { id: "AAA3", title: "AmiLuna Botanical IV", src: "artworks/AAA3.jpg" },
  { id: "AAA1", title: "AmiLuna Botanical V", src: "artworks/AAA1.jpg" },
  { id: "AAA5", title: "AmiLuna Botanical VI", src: "artworks/AAA5.jpg" },
  { id: "AAA2", title: "AmiLuna Centerpiece", src: "artworks/AAA2.jpg" }
];

const form = document.getElementById("ai-generator-form");
const artworkSelect = document.getElementById("ai-artwork");
const promptInput = document.getElementById("ai-prompt");
const submitButton = document.getElementById("ai-generate-btn");
const status = document.getElementById("ai-visualizer-status");
const result = document.getElementById("ai-visualizer-result");
const resultImage = document.getElementById("ai-visualizer-image");

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#f0b3a3" : "#d7c9aa";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadArtworkImage(artwork) {
  const response = await fetch(buildPublicAssetUrl(artwork.src));
  if (!response.ok) throw new Error("The selected artwork could not be loaded.");
  const blob = await response.blob();
  if (blob.size > 7 * 1024 * 1024) throw new Error("This artwork image is too large to visualize.");
  return {
    imageBase64: await fileToBase64(blob),
    mimeType: blob.type === "image/png" ? "image/png" : "image/jpeg"
  };
}

function populateArtworkChoices() {
  if (!artworkSelect) return;
  artworkSelect.innerHTML = artworks
    .map((artwork) => `<option value="${artwork.id}">${artwork.title}</option>`)
    .join("");
}

populateArtworkChoices();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const artwork = artworks.find((item) => item.id === artworkSelect?.value);
  const environment = promptInput?.value.trim();
  if (!artwork || !environment) {
    setStatus("Choose an artwork and describe the room you want to see.", true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Creating your room preview...";
  result.hidden = true;
  setStatus("Preparing the artwork and asking Gemini to style the room...");

  try {
    const { imageBase64, mimeType } = await loadArtworkImage(artwork);
    const response = await fetch(buildFunctionUrl("/.netlify/functions/gemini-room-visualizer"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artworkTitle: artwork.title,
        environment,
        imageBase64,
        mimeType
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.imageDataUrl) {
      throw new Error(payload.error || "Unable to create an AI room preview.");
    }

    resultImage.src = payload.imageDataUrl;
    result.hidden = false;
    setStatus("Your AI room preview is ready.");
  } catch (error) {
    setStatus(error.message || "Unable to create an AI room preview. Please try again.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Generate & Visualize";
  }
});
