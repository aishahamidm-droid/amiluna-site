import { addCartItem } from "./cart-store.js";
import {
  fetchProductById,
  fetchProducts,
  formatPrice,
  getPrimaryImage,
  getRelatedProducts,
  getVariantPrice
} from "./storefront-api.js";

const stage = document.getElementById("product-stage");
const relatedSection = document.getElementById("related-section");
const relatedGrid = document.getElementById("related-grid");

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function showToast(message) {
  let toast = document.querySelector(".commerce-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "commerce-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function renderStatus(title, message) {
  stage.innerHTML = `
    <article class="status-card">
      <p class="section-kicker">${title}</p>
      <h2>${message}</h2>
      <p>Please return to collections and try another piece.</p>
    </article>
  `;
}

function renderSkeleton() {
  stage.innerHTML = `
    <div class="product-skeleton">
      <div class="skeleton-block"></div>
      <div class="skeleton-block"></div>
    </div>
  `;
}

function buildImageList(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.length
    ? images.map((image) => image.src)
    : [getPrimaryImage(product)].filter(Boolean);
}

function buildVariantState(product) {
  const options = Array.isArray(product.options) ? product.options : [];
  const enabledAndAvailableVariants = (product.variants || []).filter(
    (variant) => variant.is_enabled !== false && variant.is_available !== false
  );
  const availableVariants = enabledAndAvailableVariants.length
    ? enabledAndAvailableVariants
    : (product.variants || []).filter((variant) => variant.is_available !== false);
  const variantPool = availableVariants.length ? availableVariants : (product.variants || []);
  const fallbackVariant = variantPool[0] || product.variants?.[0] || null;

  const filteredOptions = options
    .map((option, optionIndex) => {
      const allowedValueIds = new Set(
        variantPool
          .map((variant) => variant.options?.[optionIndex])
          .filter((valueId) => valueId !== undefined && valueId !== null)
          .map(String)
      );

      return {
        ...option,
        values: Array.isArray(option.values)
          ? option.values.filter((value) => allowedValueIds.has(String(value.id)))
          : []
      };
    })
    .filter((option) => option.values.length);

  const selectedOptions = {};
  filteredOptions.forEach((option) => {
    const firstValue = option.values?.[0];
    if (firstValue) {
      selectedOptions[option.name] = firstValue.id;
    }
  });

    function findMatchingVariant() {
        if (!filteredOptions.length) {
          return fallbackVariant;
        }

        return (
          variantPool.find((variant) =>
        filteredOptions.every((option, index) => String(variant.options?.[index]) === String(selectedOptions[option.name]))
      ) || fallbackVariant
    );
  }

  function syncFromVariant(variant) {
    if (!variant || !filteredOptions.length) {
      return;
    }

    filteredOptions.forEach((option, index) => {
      selectedOptions[option.name] = variant.options?.[index];
    });
  }

  syncFromVariant(fallbackVariant);

  return {
    options: filteredOptions,
    get variant() {
      return findMatchingVariant();
    },
    get selectedOptions() {
      return selectedOptions;
    },
    updateOption(optionName, valueId) {
      selectedOptions[optionName] = valueId;
    }
  };
}

function renderRelated(products) {
  if (!products.length) {
    relatedSection.hidden = true;
    return;
  }

  relatedSection.hidden = false;
  relatedGrid.innerHTML = products
    .map((product) => `
      <a class="related-card" href="product.html?id=${product.id}">
        <img src="${getPrimaryImage(product)}" alt="${product.title}" loading="lazy">
        <h3>${product.title}</h3>
        <p>${formatPrice(product.variants?.[0]?.price ?? null)}</p>
      </a>
    `)
    .join("");
}

function initGallery(images) {
  const mainImage = document.getElementById("product-main-image");
  const mainFigure = document.getElementById("product-main-figure");
  const thumbRow = document.getElementById("product-thumb-row");
  let activeIndex = 0;
  let startX = 0;

  function setImage(index) {
    activeIndex = (index + images.length) % images.length;
    mainImage.src = images[activeIndex];
    thumbRow.querySelectorAll(".thumb-btn").forEach((button, buttonIndex) => {
      button.classList.toggle("active", buttonIndex === activeIndex);
    });
  }

  thumbRow.innerHTML = images
    .map((image, index) => `
      <button class="thumb-btn${index === 0 ? " active" : ""}" type="button" data-index="${index}">
        <img src="${image}" alt="Artwork angle ${index + 1}" loading="lazy">
      </button>
    `)
    .join("");

  thumbRow.addEventListener("click", (event) => {
    const button = event.target.closest(".thumb-btn");
    if (!button) {
      return;
    }

    setImage(Number(button.dataset.index));
  });

  mainFigure.addEventListener("mousemove", (event) => {
    const bounds = mainFigure.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    mainFigure.style.setProperty("--zoom-x", `${x}%`);
    mainFigure.style.setProperty("--zoom-y", `${y}%`);
  });

  mainFigure.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover)").matches) {
      mainFigure.classList.add("is-zoomed");
    }
  });

  mainFigure.addEventListener("mouseleave", () => {
    mainFigure.classList.remove("is-zoomed");
  });

  mainFigure.addEventListener("touchstart", (event) => {
    startX = event.changedTouches[0].clientX;
  }, { passive: true });

  mainFigure.addEventListener("touchend", (event) => {
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) < 40) {
      return;
    }

    setImage(delta < 0 ? activeIndex + 1 : activeIndex - 1);
  }, { passive: true });
}

function renderOptionControls(product, variantState) {
  const controls = document.getElementById("product-options");
  const options = variantState.options;
  const sizeOption = options.find((option) => /size/i.test(option.name));
  const otherOptions = options.filter((option) => option !== sizeOption);

  const parts = [];

  if (sizeOption) {
    parts.push(`
      <div class="option-group">
        <p class="option-label">Available sizes</p>
        <div class="size-pills" id="size-pills">
          ${sizeOption.values.map((value) => `
            <button
              class="size-pill${String(variantState.selectedOptions[sizeOption.name]) === String(value.id) ? " active" : ""}"
              type="button"
              data-option-name="${sizeOption.name}"
              data-value-id="${value.id}"
            >${value.title}</button>
          `).join("")}
        </div>
      </div>
    `);
  }

  otherOptions.forEach((option) => {
    parts.push(`
      <label class="option-group">
        <span class="option-label">${option.name}</span>
        <select class="option-select" data-option-name="${option.name}">
          ${option.values.map((value) => `
            <option value="${value.id}" ${String(variantState.selectedOptions[option.name]) === String(value.id) ? "selected" : ""}>${value.title}</option>
          `).join("")}
        </select>
      </label>
    `);
  });

  if (!parts.length) {
    parts.push(`
      <div class="option-group">
        <span class="option-label">Variant</span>
        <select class="option-select" id="variant-select">
          ${(product.variants || []).map((variant) => `
            <option value="${variant.id}">${variant.title}</option>
          `).join("")}
        </select>
      </div>
    `);
  }

  controls.innerHTML = parts.join("");

  const sizePills = controls.querySelector("#size-pills");
  if (sizePills) {
    sizePills.addEventListener("click", (event) => {
      const button = event.target.closest(".size-pill");
      if (!button) {
        return;
      }

      sizePills.querySelectorAll(".size-pill").forEach((pill) => {
        pill.classList.remove("active");
      });
      button.classList.add("active");
      variantState.updateOption(button.dataset.optionName, button.dataset.valueId);
      updateVariantSummary(variantState.variant);
    });
  }

  controls.querySelectorAll(".option-select").forEach((select) => {
    select.addEventListener("change", () => {
      if (select.id === "variant-select") {
        return;
      }

      variantState.updateOption(select.dataset.optionName, select.value);
      updateVariantSummary(variantState.variant);
    });
  });

  const variantSelect = controls.querySelector("#variant-select");
  if (variantSelect) {
    variantSelect.addEventListener("change", () => {
      const variant = (product.variants || []).find(
        (entry) => String(entry.id) === variantSelect.value
      );
      updateVariantSummary(variant);
    });
  }
}

function updateVariantSummary(variant) {
  const summary = document.getElementById("variant-summary");
  const price = document.getElementById("detail-price");
  summary.textContent = variant?.title || "Ready to add";
  price.textContent = formatPrice(getVariantPrice(variant));
}

function buildCartItem(product, variant, quantity) {
  return {
    productId: String(product.id),
    variantId: String(variant?.id || product.id),
    title: product.title,
    variantTitle: variant?.title || "Default",
    priceCents: getVariantPrice(variant) ?? 0,
    quantity,
    image: getPrimaryImage(product)
  };
}

function renderProduct(product, relatedProducts) {
  const images = buildImageList(product);
  const variantState = buildVariantState(product);
  const currentVariant = variantState.variant;

  stage.innerHTML = `
    <div class="product-detail-grid">
      <section class="gallery-panel">
        <div class="main-figure" id="product-main-figure">
          <img id="product-main-image" src="${images[0]}" alt="${product.title}">
        </div>
        <p class="swipe-hint">Swipe the image to explore the piece</p>
        <div class="thumb-row" id="product-thumb-row"></div>
      </section>

      <section class="detail-panel">
        <p class="detail-kicker">AmiLuna Artwork</p>
        <h1>${product.title}</h1>
        <p class="detail-price" id="detail-price">${formatPrice(getVariantPrice(currentVariant))}</p>
        <p class="detail-description">${product.description || "A premium AmiLuna wall art piece prepared for elegant interiors."}</p>

        <div id="product-options"></div>

        <div class="option-group">
          <span class="option-label">Quantity</span>
          <div class="quantity-row">
            <button class="qty-step" type="button" id="qty-decrease">-</button>
            <input class="quantity-input" id="quantity-input" type="number" min="1" value="1">
            <button class="qty-step" type="button" id="qty-increase">+</button>
          </div>
        </div>

        <div class="cta-row">
          <button class="primary-btn" type="button" id="add-to-cart-btn">Add to Cart</button>
          <button class="secondary-btn" type="button" id="buy-now-btn">Buy Now</button>
        </div>

        <div class="detail-meta">
          <p><strong>Selected variant:</strong> <span id="variant-summary">${currentVariant?.title || "Ready to add"}</span></p>
          <p><strong>Shipping estimate:</strong> Calculated at checkout in the next phase.</p>
          <p><strong>Printify product ID:</strong> ${product.id}</p>
        </div>
      </section>
    </div>
  `;

  renderOptionControls(product, variantState);
  updateVariantSummary(currentVariant);
  initGallery(images);
  renderRelated(relatedProducts);

  const quantityInput = document.getElementById("quantity-input");
  document.getElementById("qty-decrease").addEventListener("click", () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value || 1) - 1));
  });
  document.getElementById("qty-increase").addEventListener("click", () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value || 1) + 1));
  });

  document.getElementById("add-to-cart-btn").addEventListener("click", () => {
    const variant = variantState.options.length
      ? variantState.variant
      : (product.variants || []).find((entry) => String(entry.id) === document.getElementById("variant-select")?.value) || currentVariant;

    const quantity = Math.max(1, Number(quantityInput.value) || 1);
    addCartItem(buildCartItem(product, variant, quantity));
    showToast("Added to your AmiLuna cart");
  });

  document.getElementById("buy-now-btn").addEventListener("click", () => {
    const variant = variantState.options.length
      ? variantState.variant
      : (product.variants || []).find((entry) => String(entry.id) === document.getElementById("variant-select")?.value) || currentVariant;

    const quantity = Math.max(1, Number(quantityInput.value) || 1);
    addCartItem(buildCartItem(product, variant, quantity));
    window.location.href = "cart.html";
  });
}

async function initProductPage() {
  renderSkeleton();

  const productId = getProductIdFromUrl();
  if (!productId) {
    renderStatus("Missing product", "We could not find that artwork.");
    return;
  }

  try {
    const [product, products] = await Promise.all([
      fetchProductById(productId),
      fetchProducts()
    ]);

    if (!product) {
      renderStatus("Unavailable artwork", "That AmiLuna piece is not available right now.");
      return;
    }

    const relatedProducts = getRelatedProducts(product, products);
    renderProduct(product, relatedProducts);
  } catch (error) {
    renderStatus("Unable to load artwork", error.message || "Please try again soon.");
  }
}

void initProductPage();
