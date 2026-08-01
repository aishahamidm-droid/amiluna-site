import { buildPaymentApiUrl, buildPublicAssetUrl } from "./site-runtime.js";

const artworks = [
  { id: "art1", title: "Vibrant Multicolor Calla", src: "artworks/art1.jpg" },
  { id: "art2", title: "Solara Verde", src: "artworks/art2.jpg" },
  { id: "art3", title: "Moonlit Calla", src: "artworks/art3.jpg" },
  { id: "art4", title: "TerraMuse", src: "artworks/art4.jpg" },
  { id: "art5", title: "Midnight Reverie", src: "artworks/art5.jpg" },
  { id: "art6", title: "Eternal Bloom", src: "artworks/art6.jpg" },
  { id: "art7", title: "Velora Flora", src: "artworks/art7.jpg" },
  { id: "art8", title: "Forever Yours - Romantic Red Rose", src: "artworks/art8.jpg" },
  { id: "art9", title: "Celora Poise", src: "artworks/art9.jpg" },
  { id: "art11", title: "Soft Pink Calla", src: "artworks/art11.jpg" },
  { id: "art12", title: "Sage Halo", src: "artworks/art12.jpg" },
  { id: "art13", title: "Classic White Calla", src: "artworks/art13.jpg" },
  { id: "art14", title: "Monvera Noir", src: "artworks/art14.jpg" },
  { id: "art15", title: "Blush Dahlia", src: "artworks/art15.jpg" },
  { id: "art17", title: "Aurora Petalis", src: "artworks/art17.jpg" },
  { id: "art18", title: "Pure Grace Calla", src: "artworks/art18.jpg" },
  { id: "art19", title: "Blush Whisper", src: "artworks/art19.jpg" },
  { id: "art20", title: "Soft Petals Calla", src: "artworks/art20.jpg" },
  { id: "art21", title: "Emberleaf Harmony", src: "artworks/art21.jpg" },
  { id: "art22", title: "Elegant White Calla", src: "artworks/art22.jpg" },
  { id: "art23", title: "Lunara Bloom", src: "artworks/art23.jpg" },
  { id: "art24", title: "Blush Dahlia (Variation)", src: "artworks/art24.jpg" }
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
  artworkSelect.replaceChildren();
  artworks.forEach((artwork) => {
    const option = new Option(artwork.title, artwork.id);
    option.style.backgroundColor = "#f8f5ee";
    option.style.color = "#171914";
    artworkSelect.add(option);
  });
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
    const response = await fetch(buildPaymentApiUrl("/api/gemini-room-visualizer"), {
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
