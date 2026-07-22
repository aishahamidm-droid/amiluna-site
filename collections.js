import {
    fetchProducts as fetchStorefrontProducts,
    formatPrice,
    getLowestPrice,
    getPrimaryImage,
    normalizeText
} from "./storefront-api.js";
import { buildPublicAssetUrl } from "./site-runtime.js";

const LOCAL_ARTWORK_LOOKUP = [
    { artId: 1, title: "Vibrant Multicolor Calla", aliases: ["vibrant multicolor calla lily canvas wall art", "vibrant multicolor calla lily canvas wall art modern floral home decor"] },
    { artId: 2, title: "Solara Verde", aliases: ["solara verde modern abstract botanical canvas wall art"] },
    { artId: 3, title: "Moonlit Calla", aliases: [] },
    { artId: 4, title: "TerraMuse", aliases: ["terramuse modern abstract vase botanical canvas wall art"] },
    { artId: 5, title: "Midnight Reverie", aliases: ["midnight reverie abstract gold canvas wall art", "midnight reverie abstract gold canvas wall art 36×36", "midnight reverie abstract gold canvas wall art (36×36)"] },
    { artId: 6, title: "Eternal Bloom", aliases: ["eternal bloom calla lily canvas wall art", "eternal bloom — calla lily canvas wall art"] },
    { artId: 7, title: "Velora Flora", aliases: [] },
    { artId: 8, title: "Forever Yours - Romantic Red Rose", aliases: ["forever yours romantic red rose canvas for valentine’s day", "forever yours romantic red rose canvas for valentine's day"] },
    { artId: 9, title: "Celora Poise", aliases: ["celora poise botanical abstract canvas wall art", "celora poise – botanical abstract canvas wall art"] },
    { artId: 11, title: "Soft Pink Calla", aliases: ["soft pink calla lily canvas wall art modern minimal floral decor", "soft pink calla lily canvas wall art elegant floral botanical print modern gallery decor", "soft pink calla lily canvas wall art – modern minimal floral decor", "soft pink calla lily canvas wall art – elegant floral botanical print | modern gallery decor"] },
    { artId: 12, title: "Sage Halo", aliases: ["sage halo modern botanical canvas", "sage halo – modern botanical canvas"] },
    { artId: 13, title: "Classic White Calla", aliases: ["classic white calla lily canvas wall art elegant botanical home decor", "classic white calla lily canvas wall art – elegant botanical home decor"] },
    { artId: 14, title: "Monvera Noir", aliases: ["monvera noir modern abstract monstera canvas wall art", "monvera noir – modern abstract monstera canvas wall art"] },
    { artId: 15, title: "Blush Dahlia", aliases: ["blush dahlia canvas wall art elegant botanical flower print", "blush dahlia canvas wall art | elegant botanical flower print"] },
    { artId: 17, title: "Aurora Petalis", aliases: ["aurora petalis modern abstract floral canvas wall art", "aurora petalis – modern abstract floral canvas wall art"] },
    { artId: 18, title: "Pure Grace Calla", aliases: ["pure grace calla lily canvas wall art", "pure grace — calla lily canvas wall art (16×24)"] },
    { artId: 19, title: "Blush Whisper", aliases: ["blush whisper modern botanical canvas", "blush whisper – modern botanical canvas"] },
    { artId: 20, title: "Soft Petals Calla", aliases: [] },
    { artId: 21, title: "Emberleaf Harmony", aliases: ["emberleaf harmony modern abstract botanical canvas wall art", "emberleaf harmony – modern abstract botanical canvas wall art"] },
    { artId: 22, title: "Elegant White Calla", aliases: ["elegant white calla lily canvas wall art minimalist floral home decor", "elegant white calla lily canvas wall art – minimalist floral home decor"] },
    { artId: 23, title: "Lunara Bloom", aliases: ["lunara bloom modern abstract botanical canvas wall art", "lunara bloom – modern abstract botanical canvas wall art"] }
];

const collections = {
    signatures: {
        title: "The Signatures",
        keywords: []
    },
    botanical: {
        title: "Modern Botanical",
        keywords: ["botanical", "leaf", "nature", "flora"]
    },
    calla: {
        title: "Calla Lily",
        keywords: ["calla", "lily"]
    },
    aureate: {
        title: "The Aureate Edition",
        keywords: ["aureate", "gold", "mandala", "luminous", "midnight reverie"]
    },
    eternal: {
        title: "Eternal Affection",
        keywords: ["romantic", "rose", "blush", "eternal", "affection", "love"]
    }
};

const landing = document.getElementById("collections-landing");
const stage = document.getElementById("product-stage");
const inventory = document.getElementById("product-inventory");
const stageTitle = document.getElementById("stage-title");
const backButton = document.getElementById("back-to-collections");

let productCache = [];
let fetchState = "idle";
let activeCollectionType = "signatures";

function resolveLocalArtwork(product) {
    const title = normalizeText(product?.title);
    return LOCAL_ARTWORK_LOOKUP.find((artwork) => {
        const candidates = [artwork.title, ...(artwork.aliases || [])].map(normalizeText);
        return candidates.some((candidate) => title === candidate || title.includes(candidate));
    }) || null;
}

function getCardArtwork(product) {
    const artwork = resolveLocalArtwork(product);

    if (!artwork) {
        return {
            image: getPrimaryImage(product),
            hoverImage: "",
            title: product.title
        };
    }

    return {
        image: buildPublicAssetUrl(`artworks/art${artwork.artId}.jpg`),
        hoverImage: buildPublicAssetUrl(`artworks/art${artwork.artId}Pic1.png`),
        title: artwork.title
    };
}

function getCollectionProducts(type, products) {
    const config = collections[type];

    if (!config || !config.keywords.length) {
        return products;
    }

    const filtered = products.filter((product) => {
        const haystack = [
            product.title,
            product.description,
            ...(product.tags || [])
        ]
            .map(normalizeText)
            .join(" ");

        return config.keywords.some((keyword) => haystack.includes(keyword));
    });

    return filtered.length ? filtered : products;
}

function showStageStatus(title, message, actionLabel = "") {
    inventory.innerHTML = `
        <div class="stage-status">
            <p class="stage-status-kicker">${title}</p>
            <h3>${message}</h3>
            ${actionLabel ? `<button class="buy-now-btn retry-btn" type="button" id="retry-products">${actionLabel}</button>` : ""}
        </div>
    `;

    const retryButton = document.getElementById("retry-products");
    if (retryButton) {
        retryButton.addEventListener("click", () => {
            void loadCollection(activeCollectionType, { forceRefresh: true });
        });
    }
}

function renderProducts(type, products) {
    inventory.innerHTML = "";

    const items = getCollectionProducts(type, products);

    if (!items.length) {
        showStageStatus("No products yet", "This collection is still being prepared.");
        return;
    }

    items.forEach((product) => {
        const artwork = getCardArtwork(product);
        const price = getLowestPrice(product);

        inventory.insertAdjacentHTML(
            "beforeend",
            `
                <article class="product-card live-product">
                    <div class="card-3d">
                        <div class="face art-face">
                            ${artwork.image ? `<img src="${artwork.image}" data-primary-image="${artwork.image}" data-hover-image="${artwork.hoverImage}" alt="${artwork.title}">` : `<div class="product-image-fallback">Artwork preview coming soon</div>`}
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>${artwork.title}</h3>
                        <p>${formatPrice(price)}</p>
                        <div class="product-actions">
                            <a class="buy-now-btn" href="product.html?id=${product.id}">Buy Now</a>
                        </div>
                    </div>
                </article>
            `
        );
    });

    inventory.querySelectorAll(".art-face img[data-hover-image]").forEach((image) => {
        const primaryImage = image.dataset.primaryImage || image.src;
        const hoverImage = image.dataset.hoverImage;

        if (!hoverImage) {
            return;
        }

        const showHoverImage = () => {
            image.src = hoverImage;
        };

        const showPrimaryImage = () => {
            image.src = primaryImage;
        };

        image.closest(".product-card")?.addEventListener("mouseenter", showHoverImage);
        image.closest(".product-card")?.addEventListener("mouseleave", showPrimaryImage);
        image.closest(".product-card")?.addEventListener("focusin", showHoverImage);
        image.closest(".product-card")?.addEventListener("focusout", showPrimaryImage);
    });
}

async function fetchProducts(forceRefresh = false) {
    if (fetchState === "loaded" && !forceRefresh) {
        return productCache;
    }

    fetchState = "loading";
    productCache = await fetchProductsFromApi(forceRefresh);
    fetchState = "loaded";
    return productCache;
}

async function fetchProductsFromApi(forceRefresh = false) {
    return fetchStorefrontProducts({ forceRefresh });
}

async function loadCollection(type, { forceRefresh = false } = {}) {
    activeCollectionType = type;
    stageTitle.innerText = collections[type]?.title || "Collection";
    showStageStatus("Loading products", "Please give us a moment while AmiLuna prepares the collection.");
    landing.style.opacity = "0";

    setTimeout(() => {
        landing.style.display = "none";
        stage.classList.remove("hidden");
        window.scrollTo(0, 0);
    }, 500);

    try {
        const products = await fetchProducts(forceRefresh);
        renderProducts(type, products);
    } catch (error) {
        fetchState = "error";
        showStageStatus(
            "Unable to load products",
            error.message || "Please try again in a moment.",
            "Try Again"
        );
    }
}

document.querySelectorAll(".item").forEach((item) => {
    const setFocus = () => {
        document.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
    };

    item.addEventListener("mouseenter", setFocus);
    item.addEventListener("focus", setFocus);
    item.addEventListener("click", () => {
        if (item.dataset.col) {
            void loadCollection(item.dataset.col);
        }
    });
});

// Back Navigation
backButton.onclick = () => {
    stage.classList.add("hidden");
    landing.style.display = "flex";
    setTimeout(() => (landing.style.opacity = "1"), 50);
};
