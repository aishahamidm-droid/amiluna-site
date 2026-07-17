const PAYMENT_STORAGE_KEY = "amiluna_payment_v1";

function readState() {
  try {
    const rawValue = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (!rawValue) {
      return {
        pendingByReference: {},
        verifiedByReference: {}
      };
    }

    const parsed = JSON.parse(rawValue);
    return {
      pendingByReference:
        parsed?.pendingByReference && typeof parsed.pendingByReference === "object"
          ? parsed.pendingByReference
          : {},
      verifiedByReference:
        parsed?.verifiedByReference && typeof parsed.verifiedByReference === "object"
          ? parsed.verifiedByReference
          : {}
    };
  } catch (error) {
    return {
      pendingByReference: {},
      verifiedByReference: {}
    };
  }
}

function writeState(state) {
  window.localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(state));
}

export function savePendingPayment(payment) {
  const state = readState();
  state.pendingByReference[payment.reference] = payment;
  writeState(state);
}

export function getPendingPayment(reference) {
  const state = readState();
  return state.pendingByReference[String(reference || "")] || null;
}

export function clearPendingPayment(reference) {
  const state = readState();
  delete state.pendingByReference[String(reference || "")];
  writeState(state);
}

export function saveVerifiedPayment(payment) {
  const state = readState();
  state.verifiedByReference[payment.reference] = payment;
  writeState(state);
}

export function getVerifiedPayment(reference) {
  const state = readState();
  return state.verifiedByReference[String(reference || "")] || null;
}
