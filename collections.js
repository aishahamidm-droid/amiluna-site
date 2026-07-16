// MASTER DATA: Titles mapped to art ID
const artData = {
    1: { title: "Vibrant Multicolor Calla" },
    2: { title: "Solara Verde" },
    3: { title: "Moonlit Calla" },
    4: { title: "TerraMuse" },
    5: { title: "Midnight Reverie" },
    6: { title: "Eternal Bloom" },
    7: { title: "Velora Flora" },
    8: { title: "Forever Yours - Romantic Red Rose" },
    9: { title: "Celora Poise" },
    11: { title: "Soft Pink Calla" },
    12: { title: "Sage Halo" },
    13: { title: "Classic White Calla" },
    14: { title: "Monvera Noir" },
    15: { title: "Blush Dahlia" },
    17: { title: "Aurora Petalis" },
    18: { title: "Pure Grace Calla" },
    19: { title: "Blush Whisper" },
    20: { title: "Soft Petals Calla" },
    21: { title: "Emberleaf Harmony" },
    22: { title: "Elegant White Calla" },
    23: { title: "Lunara Bloom" },
    24: { title: "Blush Dahlia" }
};

// COLLECTIONS CONFIGURATION
const collections = {
    signatures: Array.from({ length: 24 }, (_, i) => i + 1),
    botanical: [2, 4, 7, 9, 12, 14, 17, 19, 21, 23],
    calla: [22, 20, 18, 13, 11, 6, 1, 3],
    aureate: [5],
    eternal: [8, 24, 15]
};

const landing = document.getElementById("collections-landing");
const stage = document.getElementById("product-stage");
const inventory = document.getElementById("product-inventory");
const stageTitle = document.getElementById("stage-title");

function loadCollection(type) {
    inventory.innerHTML = "";
    const ids = collections[type];

    const displayTitles = {
        signatures: "The Signatures",
        botanical: "Modern Botanical",
        calla: "Calla Lily",
        aureate: "The Aureate Edition",
        eternal: "Eternal Affection"
    };

    stageTitle.innerText = displayTitles[type];

    ids.forEach((id) => {
        const item = artData[id];
        inventory.innerHTML += `
            <div class="product-card">
                <div class="card-3d">
                    <div class="face art-face"><img src="artworks/art${id}.jpg" alt="${item.title}"></div>
                    <div class="face room-face"><img src="artworks/art${id}Pic1.png" alt="${item.title} Room"></div>
                </div>
                <div class="product-info">
                    <h3>${item.title}</h3>
                </div>
            </div>`;
    });

    landing.style.opacity = "0";
    setTimeout(() => {
        landing.style.display = "none";
        stage.classList.remove("hidden");
        window.scrollTo(0, 0);
    }, 500);
}

document.querySelectorAll(".item").forEach((item) => {
    const setFocus = () => {
        document.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
    };

    item.addEventListener("mouseenter", setFocus);
    item.addEventListener("focus", setFocus);
    item.addEventListener("click", () => {
        if (item.dataset.col) loadCollection(item.dataset.col);
    });
});

// Back Navigation
document.getElementById("back-to-collections").onclick = () => {
    stage.classList.add("hidden");
    landing.style.display = "flex";
    setTimeout(() => (landing.style.opacity = "1"), 50);
};

// Add click-to-flip functionality for mobile users
document.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (card) {
        card.classList.toggle("flipped");

        document.querySelectorAll(".product-card").forEach((c) => {
            if (c !== card) c.classList.remove("flipped");
        });
    }
});
