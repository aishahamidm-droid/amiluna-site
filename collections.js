import {
    fetchProducts as fetchStorefrontProducts,
    formatPrice,
    getLowestPrice,
    getPrimaryImage,
    normalizeText
} from "./storefront-api.js";

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
        const price = getLowestPrice(product);

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
                        <div class="product-actions">
                            <a class="details-link" href="product.html?id=${product.id}">View Details</a>
                            <a class="buy-now-btn" href="product.html?id=${product.id}">Buy Now</a>
                        </div>
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
