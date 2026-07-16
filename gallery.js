const artworks = [
    { file: "art1.jpg", title: "Vibrant Multicolor Calla", orientation: "vertical", section: "Calla Lily", blurb: "Layered floral detail for elegant portrait walls." },
    { file: "art3.jpg", title: "Moonlit Calla", orientation: "vertical", section: "Calla Lily", blurb: "A darker, moodier calla composition with soft drama." },
    { file: "art5.jpg", title: "Midnight Reverie", orientation: "vertical", section: "Aureate", blurb: "Deep contrast and glowing detail for richer interiors." },
    { file: "art7.jpg", title: "Velora Flora", orientation: "vertical", section: "Botanical", blurb: "A fuller botanical study with layered stems and bloom." },
    { file: "art8.jpg", title: "Forever Yours - Romantic Red Rose", orientation: "vertical", section: "Romantic Floral", blurb: "A romantic statement piece built around a classic rose." },
    { file: "art12.jpg", title: "Sage Halo", orientation: "vertical", section: "Botanical", blurb: "Calm tones and restrained botanical movement." },
    { file: "art13.jpg", title: "Classic White Calla", orientation: "vertical", section: "Calla Lily", blurb: "A classic floral portrait with a gentle neutral palette." },
    { file: "art22.jpg", title: "Elegant White Calla", orientation: "vertical", section: "Calla Lily", blurb: "Minimal floral styling for lighter, refined spaces." },
    { file: "art2.jpg", title: "Solara Verde", orientation: "horizontal", section: "Botanical", blurb: "A wide-format botanical composition with soft warmth." },
    { file: "art4.jpg", title: "TerraMuse", orientation: "horizontal", section: "Botanical", blurb: "Earth-toned floral language in a broad format." },
    { file: "art6.jpg", title: "Eternal Bloom", orientation: "horizontal", section: "Calla Lily", blurb: "A wider floral story designed for softer rooms." },
    { file: "art9.jpg", title: "Celora Poise", orientation: "horizontal", section: "Botanical", blurb: "Poised negative space with a clean botanical rhythm." },
    { file: "art11.jpg", title: "Soft Pink Calla", orientation: "horizontal", section: "Calla Lily", blurb: "A softer floral spread with warm romantic undertones." },
    { file: "art14.jpg", title: "Monvera Noir", orientation: "horizontal", section: "Botanical", blurb: "Dark leaves and modern contrast in landscape format." },
    { file: "art15.jpg", title: "Blush Dahlia", orientation: "horizontal", section: "Romantic Floral", blurb: "A wider floral piece with airy blush color." },
    { file: "art17.jpg", title: "Aurora Petalis", orientation: "horizontal", section: "Romantic Floral", blurb: "A broader floral composition with glowing petals." },
    { file: "art18.jpg", title: "Pure Grace Calla", orientation: "horizontal", section: "Calla Lily", blurb: "Quiet floral balance in a graceful panoramic format." },
    { file: "art19.jpg", title: "Blush Whisper", orientation: "horizontal", section: "Romantic Floral", blurb: "A soft botanical landscape for quieter interiors." },
    { file: "art20.jpg", title: "Soft Petals Calla", orientation: "horizontal", section: "Calla Lily", blurb: "Gentle calla movement in a longer wall-friendly frame." },
    { file: "art21.jpg", title: "Emberleaf Harmony", orientation: "horizontal", section: "Botanical", blurb: "Dark botanical warmth with a more grounded feel." },
    { file: "art23.jpg", title: "Lunara Bloom", orientation: "horizontal", section: "Romantic Floral", blurb: "Floral softness arranged for wide-format spaces." },
    { file: "art24.jpg", title: "Blush Dahlia", orientation: "horizontal", section: "Romantic Floral", blurb: "A second blush floral variation with a calm, airy tone." }
];

const filterBtns = document.querySelectorAll(".filter-btn");
const featuredCard = document.getElementById("featured-card");
const galleryGrid = document.getElementById("gallery-grid");
const heroViewer = document.getElementById("hero-viewer");
const heroImg = document.getElementById("hero-img");
const heroTitle = document.getElementById("hero-title");
const heroThumbStrip = document.getElementById("hero-thumb-strip");
const closeHeroBtn = document.getElementById("close-hero");
const galleryContainer = document.getElementById("gallery-container");
const heroMainView = document.querySelector(".hero-main-view");

let currentFilter = "vertical";
let currentFeaturedIndex = 0;
let viewerImages = [];
let viewerIndex = 0;
let touchStartX = 0;
let touchDeltaX = 0;

function getFilteredArtworks() {
    return artworks.filter((artwork) => artwork.orientation === currentFilter);
}

function getPreviewImages(baseName) {
    return Array.from({ length: 5 }, (_, index) => `/artworks/${baseName}Pic${index + 1}.png`);
}

function renderViewerDots() {
    heroThumbStrip.innerHTML = "";
    viewerImages.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = `viewer-dot${index === viewerIndex ? " active" : ""}`;
        dot.setAttribute("aria-label", `View ${index + 1}`);
        dot.addEventListener("click", (event) => {
            event.stopPropagation();
            setViewerImage(index);
        });
        heroThumbStrip.appendChild(dot);
    });
}

function setViewerImage(index) {
    if (!viewerImages.length) return;
    viewerIndex = (index + viewerImages.length) % viewerImages.length;
    heroImg.src = viewerImages[viewerIndex];
    heroMainView.dataset.viewerIndex = String(viewerIndex);
    renderViewerDots();
}

function openViewer(artwork) {
    const baseName = artwork.file.replace(".jpg", "");
    const mainPath = `/artworks/${artwork.file}`;
    heroTitle.innerText = artwork.title;
    viewerImages = [mainPath, ...getPreviewImages(baseName)];
    viewerIndex = 0;
    heroImg.onerror = () => {
        heroImg.src = mainPath;
    };
    setViewerImage(0);

    heroViewer.classList.add("active");
    galleryContainer.style.opacity = "0";
}

function renderSpotlight(filtered) {
    const artwork = filtered[currentFeaturedIndex] || filtered[0];
    featuredCard.innerHTML = `
        <article class="spotlight-card spotlight-${artwork.orientation}">
            <div class="spotlight-copy">
                <p class="artwork-kicker">${artwork.section}</p>
                <h2>${artwork.title}</h2>
                <p class="spotlight-summary">${artwork.blurb}</p>
                <button class="spotlight-open" type="button">Open artwork</button>
            </div>
            <div class="spotlight-frame">
                <img src="/artworks/${artwork.file}" alt="${artwork.title}">
            </div>
        </article>
    `;

    featuredCard.querySelector(".spotlight-card").addEventListener("click", () => openViewer(artwork));
    featuredCard.querySelector(".spotlight-open").addEventListener("click", (event) => {
        event.stopPropagation();
        openViewer(artwork);
    });
}

function createTile(artwork, index) {
    const tile = document.createElement("article");
    const isActive = index === currentFeaturedIndex;
    tile.className = `gallery-tile tile-${artwork.orientation}${isActive ? " active" : ""}`;
    tile.innerHTML = `
        <div class="artwork-frame">
            <img src="/artworks/${artwork.file}" alt="${artwork.title}">
        </div>
        <div class="artwork-copy">
            <p class="artwork-kicker">${artwork.section}</p>
            <h3>${artwork.title}</h3>
        </div>
    `;

    tile.addEventListener("click", () => {
        currentFeaturedIndex = index;
        renderGallery();
    });

    tile.addEventListener("dblclick", () => openViewer(artwork));
    return tile;
}

function renderGallery() {
    const filtered = getFilteredArtworks();
    if (!filtered.length) return;

    if (currentFeaturedIndex >= filtered.length) {
        currentFeaturedIndex = 0;
    }

    renderSpotlight(filtered);
    galleryGrid.innerHTML = "";
    filtered.forEach((artwork, index) => {
        galleryGrid.appendChild(createTile(artwork, index));
    });
}

filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterBtns.forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        currentFeaturedIndex = 0;
        renderGallery();
    });
});

closeHeroBtn.onclick = () => {
    heroViewer.classList.remove("active");
    galleryContainer.style.opacity = "1";
};

heroMainView.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchDeltaX = 0;
}, { passive: true });

heroMainView.addEventListener("touchmove", (event) => {
    touchDeltaX = event.changedTouches[0].clientX - touchStartX;
}, { passive: true });

heroMainView.addEventListener("touchend", () => {
    if (Math.abs(touchDeltaX) < 40) return;
    if (touchDeltaX < 0) {
        setViewerImage(viewerIndex + 1);
    } else {
        setViewerImage(viewerIndex - 1);
    }
});

heroMainView.addEventListener("click", (event) => {
    if (!viewerImages.length) return;
    const bounds = heroMainView.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    if (clickX < bounds.width * 0.35) {
        setViewerImage(viewerIndex - 1);
    } else if (clickX > bounds.width * 0.65) {
        setViewerImage(viewerIndex + 1);
    }
});

renderGallery();
