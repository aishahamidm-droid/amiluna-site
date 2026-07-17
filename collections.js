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

function formatPrice(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "Price unavailable";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value / 100);
}

function getPrimaryImage(product) {
    const images = Array.isArray(product.images) ? product.images : [];
    return (
        images.find((image) => image.is_default)?.src ||
        images[0]?.src ||
        ""
    );
}

function getPrimaryPrice(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const enabledVariants = variants.filter((variant) => variant.is_enabled !== false);
    const pool = enabledVariants.length ? enabledVariants : variants;
    const priced = pool.filter((variant) => typeof variant.price === "number");

    if (!priced.length) {
        return null;
    }

    return Math.min(...priced.map((variant) => variant.price));
}

function normalizeText(value) {
    return String(value || "").toLowerCase();
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
        const image = getPrimaryImage(product);
        const price = getPrimaryPrice(product);

        inventory.insertAdjacentHTML(
            "beforeend",
            `
                <article class="product-card live-product">
                    <div class="card-3d">
                        <div class="face art-face">
                            ${image ? `<img src="${image}" alt="${product.title}">` : `<div class="product-image-fallback">Artwork preview coming soon</div>`}
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>${product.title}</h3>
                        <p>${formatPrice(price)}</p>
                        <button class="buy-now-btn" type="button">Buy Now</button>
                    </div>
                </article>
            `
        );
    });
}

async function fetchProducts(forceRefresh = false) {
    if (fetchState === "loaded" && !forceRefresh) {
        return productCache;
    }

    fetchState = "loading";

    const response = await fetch("/.netlify/functions/printify-products", {
        headers: {
            Accept: "application/json"
        }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load products right now.");
    }

    productCache = Array.isArray(payload.products) ? payload.products : [];
    fetchState = "loaded";
    return productCache;
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
