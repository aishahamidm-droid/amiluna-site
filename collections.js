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

const LOCAL_ARTWORK_BY_PRODUCT_ID = Object.freeze({
    "69b3dd3de45532ea5106081a": 7,
    "69b3adfc15a5aee0e1090734": 3,
    "69a2a3267fc2996b8d0a5f16": 9,
    "69a2750b0a8a4d5b290e1481": 5,
    "699211e4bca977ae630bc10b": 12,
    "699206a4363a97abcf0ee359": 19,
    "699191bb064523edc10c3a24": 15,
    "69906af880720a653b048b73": 8,
    "6990642c5f277c55ae0b2106": 21,
    "69905c2cbca977ae630b7132": 14,
    "699052e7a0b737bc680266e1": 23,
    "69904f5990577c34b00473d8": 2,
    "699023d490577c34b0046c04": 6,
    "69901c0aa0b737bc68025d4f": 13,
    "699017e5bca977ae630b651a": 22,
    "69900b6fea7b7f223102c2f9": 11,
    "69900326bfa0b2594a0819c1": 20,
    "698f42205d1aa081770d9d1e": 1,
    "698f0aaeee46427fa70ca5e1": 4,
    "698ec614e6f166ad24049c05": 17,
    "698e8dcf8db76bef7503f9da": 18
});

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
        productIds: ["69a2750b0a8a4d5b290e1481"]
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
    const artId = LOCAL_ARTWORK_BY_PRODUCT_ID[product?.id] || resolveLocalArtwork(product)?.artId;

    if (!artId) {
        const image = getPrimaryImage(product);
        if (!image) return null;

        const roomImage = (Array.isArray(product?.images) ? product.images : [])
            .find((candidate) => candidate.src && candidate.src !== image)?.src || image;

        return {
            image,
            roomImage,
            title: String(product?.title || "AmiLuna artwork").trim()
        };
    }

    return {
        image: buildPublicAssetUrl(`artworks/art${artId}.jpg`),
        roomImage: buildPublicAssetUrl(`artworks/art${artId}Pic1.jpg`),
        title: product.title.trim()
    };
}

function getCollectionProducts(type, products) {
    const config = collections[type];

    if (!config || (!config.keywords?.length && !config.productIds?.length)) {
        return products;
    }

    if (config.productIds?.length) {
        return products.filter((product) => config.productIds.includes(String(product.id)));
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
        if (!artwork) return;
        const price = getLowestPrice(product);

        inventory.insertAdjacentHTML(
            "beforeend",
            `
                <article class="product-card">
                    <div class="card-3d" tabindex="0" role="button" aria-pressed="false" aria-label="Show room preview for ${artwork.title}">
                        <div class="face art-face">
                            <img src="${artwork.image}" alt="${artwork.title}" loading="lazy">
                        </div>
                        <div class="face room-face">
                            <img src="${artwork.roomImage}" data-fallback-src="${artwork.image}" alt="${artwork.title} displayed in a room" loading="lazy">
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

    inventory.querySelectorAll(".card-3d").forEach((card) => {
        const productCard = card.closest(".product-card");
        const togglePreview = () => {
            const isFlipped = productCard.classList.toggle("flipped");
            card.setAttribute("aria-pressed", String(isFlipped));
        };

        card.addEventListener("click", togglePreview);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                togglePreview();
            }
        });
    });

    inventory.querySelectorAll(".room-face img").forEach((image) => {
        image.addEventListener("error", () => {
            const fallbackSource = image.dataset.fallbackSrc;
            if (fallbackSource && image.src !== new URL(fallbackSource, window.location.href).href) {
                image.src = fallbackSource;
                image.alt = `${image.alt.replace(" displayed in a room", "")} artwork preview`;
            }
        }, { once: true });
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
