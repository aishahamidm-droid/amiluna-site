const CHECKOUT_STORAGE_KEY = "amiluna_checkout_v1";

const EMPTY_CHECKOUT_DRAFT = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  region: "",
  city: "",
  postalCode: "",
  streetAddress: ""
};

export function getEmptyCheckoutDraft() {
  return { ...EMPTY_CHECKOUT_DRAFT };
}

export function readCheckoutDraft() {
  try {
    const rawValue = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!rawValue) {
      return getEmptyCheckoutDraft();
    }

    const parsed = JSON.parse(rawValue);
    return {
      ...EMPTY_CHECKOUT_DRAFT,
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch (error) {
    return getEmptyCheckoutDraft();
  }
}

export function writeCheckoutDraft(draft) {
  window.localStorage.setItem(
    CHECKOUT_STORAGE_KEY,
    JSON.stringify({
      ...EMPTY_CHECKOUT_DRAFT,
      ...(draft && typeof draft === "object" ? draft : {})
    })
  );
}
