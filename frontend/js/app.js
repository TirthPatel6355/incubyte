/**
 * Ironline Motors — frontend application logic.
 * Vanilla JS, no build step. Talks to the FastAPI backend over REST.
 */
(() => {
  "use strict";

  const API_BASE = window.API_BASE_URL || "http://localhost:8000";

  // ---------- Simple state ----------
  const state = {
    token: localStorage.getItem("ironline_token") || null,
    user: JSON.parse(localStorage.getItem("ironline_user") || "null"),
    vehicles: [],
  };

  // ---------- DOM refs ----------
  const el = (id) => document.getElementById(id);
  const navActions = el("nav-actions");
  const authScreen = el("auth-screen");
  const dashboard = el("dashboard");
  const vehicleGrid = el("vehicle-grid");
  const statusLine = el("status-line");
  const toast = el("toast");

  // ============================================================
  // API helper
  // ============================================================
  async function api(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && state.token) headers["Authorization"] = `Bearer ${state.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return null;

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* no body */
    }

    if (!res.ok) {
      const message = (data && data.detail) || `Request failed (${res.status})`;
      if (res.status === 401 && auth) logout(false);
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }
    return data;
  }

  // ============================================================
  // Toast helper
  // ============================================================
  let toastTimer = null;
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ============================================================
  // Auth
  // ============================================================
  function setSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem("ironline_token", token);
    localStorage.setItem("ironline_user", JSON.stringify(user));
  }

  function logout(showMessage = true) {
    state.token = null;
    state.user = null;
    localStorage.removeItem("ironline_token");
    localStorage.removeItem("ironline_user");
    render();
    if (showMessage) showToast("Signed out");
  }

  async function handleLogin(evt) {
    evt.preventDefault();
    const form = evt.target;
    const errorEl = el("login-error");
    errorEl.textContent = "";
    const payload = {
      email: form.email.value.trim(),
      password: form.password.value,
    };
    try {
      const tokenData = await api("/api/auth/login", { method: "POST", body: payload, auth: false });
      state.token = tokenData.access_token;
      // We don't get a /me endpoint in this API, so decode the minimal
      // admin flag from the JWT payload to drive the UI.
      const user = decodeUserFromToken(tokenData.access_token, payload.email);
      setSession(tokenData.access_token, user);
      showToast(`Welcome back, ${user.email}`);
      await loadVehicles();
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  async function handleRegister(evt) {
    evt.preventDefault();
    const form = evt.target;
    const errorEl = el("register-error");
    errorEl.textContent = "";
    const payload = {
      email: form.email.value.trim(),
      password: form.password.value,
      is_admin: form.is_admin.checked,
    };
    try {
      await api("/api/auth/register", { method: "POST", body: payload, auth: false });
      showToast("Account created — signing you in...");
      const tokenData = await api("/api/auth/login", {
        method: "POST",
        body: { email: payload.email, password: payload.password },
        auth: false,
      });
      const user = decodeUserFromToken(tokenData.access_token, payload.email);
      setSession(tokenData.access_token, user);
      await loadVehicles();
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  function decodeUserFromToken(token, email) {
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
      return { email, is_admin: !!payload.is_admin };
    } catch {
      return { email, is_admin: false };
    }
  }

  // ============================================================
  // Vehicles
  // ============================================================
  async function loadVehicles(filters = null) {
    statusLine.textContent = "Loading inventory...";
    statusLine.classList.remove("error");
    try {
      let path = "/api/vehicles";
      if (filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== "" && v !== null && v !== undefined) params.set(k, v);
        });
        const qs = params.toString();
        path = qs ? `/api/vehicles/search?${qs}` : "/api/vehicles";
      }
      state.vehicles = await api(path);
      statusLine.textContent = `${state.vehicles.length} vehicle${state.vehicles.length === 1 ? "" : "s"} on the lot`;
      renderVehicles();
    } catch (err) {
      statusLine.textContent = err.message;
      statusLine.classList.add("error");
    }
  }

  function renderVehicles() {
    vehicleGrid.innerHTML = "";
    if (state.vehicles.length === 0) {
      vehicleGrid.innerHTML = `<div class="empty-state">No vehicles match. Try clearing filters${state.user?.is_admin ? " or add one to the lot." : "."}</div>`;
      return;
    }
    for (const v of state.vehicles) {
      vehicleGrid.appendChild(vehicleCard(v));
    }
  }

  function vehicleCard(v) {
    const card = document.createElement("article");
    card.className = "vehicle-card";

    const dotClass = v.quantity === 0 ? "out" : v.quantity <= 2 ? "low" : "";
    const stockLabel = v.quantity === 0 ? "Out of stock" : `${v.quantity} in stock`;

    card.innerHTML = `
      <span class="vehicle-card__category">${escapeHtml(v.category)}</span>
      <h3 class="vehicle-card__title">${escapeHtml(v.make)} ${escapeHtml(v.model)}</h3>
      <div class="vehicle-card__price">$${Number(v.price).toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
      <div class="vehicle-card__stock"><span class="stock-dot ${dotClass}"></span>${stockLabel}</div>
      <div class="vehicle-card__actions"></div>
    `;

    const actions = card.querySelector(".vehicle-card__actions");

    const purchaseBtn = document.createElement("button");
    purchaseBtn.className = "btn btn--accent";
    purchaseBtn.textContent = "Purchase";
    purchaseBtn.disabled = v.quantity === 0;
    purchaseBtn.addEventListener("click", () => purchaseVehicle(v.id));
    actions.appendChild(purchaseBtn);

    if (state.user?.is_admin) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn--ghost btn--small";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openVehicleModal(v));
      actions.appendChild(editBtn);

      const restockBtn = document.createElement("button");
      restockBtn.className = "btn btn--ghost btn--small";
      restockBtn.textContent = "Restock";
      restockBtn.addEventListener("click", () => restockVehicle(v.id));
      actions.appendChild(restockBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn--danger btn--small";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteVehicle(v.id));
      actions.appendChild(deleteBtn);
    }

    return card;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  async function purchaseVehicle(id) {
    try {
      const result = await api(`/api/vehicles/${id}/purchase`, { method: "POST" });
      showToast(result.message);
      await loadVehicles(currentFilters());
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function restockVehicle(id) {
    const amountStr = prompt("How many units to add to stock?", "5");
    if (amountStr === null) return;
    const amount = parseInt(amountStr, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      showToast("Enter a positive whole number", true);
      return;
    }
    try {
      await api(`/api/vehicles/${id}/restock`, { method: "POST", body: { amount } });
      showToast("Vehicle restocked");
      await loadVehicles(currentFilters());
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function deleteVehicle(id) {
    if (!confirm("Remove this vehicle from the lot? This cannot be undone.")) return;
    try {
      await api(`/api/vehicles/${id}`, { method: "DELETE" });
      showToast("Vehicle removed");
      await loadVehicles(currentFilters());
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // ---------- Add / edit modal ----------
  const modal = el("vehicle-modal");
  const vehicleForm = el("vehicle-form");

  function openVehicleModal(vehicle = null) {
    vehicleForm.reset();
    el("vehicle-form-error").textContent = "";
    if (vehicle) {
      el("modal-title").textContent = "Edit vehicle";
      el("vehicle-form-submit").textContent = "Save changes";
      vehicleForm.id.value = vehicle.id;
      vehicleForm.make.value = vehicle.make;
      vehicleForm.model.value = vehicle.model;
      vehicleForm.category.value = vehicle.category;
      vehicleForm.price.value = vehicle.price;
      vehicleForm.quantity.value = vehicle.quantity;
    } else {
      el("modal-title").textContent = "Add vehicle";
      el("vehicle-form-submit").textContent = "Add to lot";
      vehicleForm.id.value = "";
    }
    modal.classList.remove("hidden");
  }

  function closeVehicleModal() {
    modal.classList.add("hidden");
  }

  async function handleVehicleFormSubmit(evt) {
    evt.preventDefault();
    const form = evt.target;
    const errorEl = el("vehicle-form-error");
    errorEl.textContent = "";

    const payload = {
      make: form.make.value.trim(),
      model: form.model.value.trim(),
      category: form.category.value.trim(),
      price: parseFloat(form.price.value),
      quantity: parseInt(form.quantity.value, 10),
    };
    const id = form.id.value;

    try {
      if (id) {
        await api(`/api/vehicles/${id}`, { method: "PUT", body: payload });
        showToast("Vehicle updated");
      } else {
        await api("/api/vehicles", { method: "POST", body: payload });
        showToast("Vehicle added to the lot");
      }
      closeVehicleModal();
      await loadVehicles(currentFilters());
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  // ---------- Filters ----------
  function currentFilters() {
    const filters = {
      make: el("filter-make").value.trim(),
      model: el("filter-model").value.trim(),
      category: el("filter-category").value.trim(),
      min_price: el("filter-min-price").value,
      max_price: el("filter-max-price").value,
    };
    const hasAny = Object.values(filters).some((v) => v !== "");
    return hasAny ? filters : null;
  }

  function clearFilters() {
    ["filter-make", "filter-model", "filter-category", "filter-min-price", "filter-max-price"].forEach(
      (id) => (el(id).value = "")
    );
    loadVehicles();
  }

  // ============================================================
  // Rendering / navigation
  // ============================================================
  function renderNav() {
    navActions.innerHTML = "";
    if (state.user) {
      const chip = document.createElement("span");
      chip.className = "user-chip";
      chip.textContent = state.user.email;
      if (state.user.is_admin) {
        const badge = document.createElement("span");
        badge.className = "role-badge";
        badge.textContent = "ADMIN";
        chip.appendChild(badge);
      }
      const logoutBtn = document.createElement("button");
      logoutBtn.className = "btn btn--ghost btn--small";
      logoutBtn.textContent = "Sign out";
      logoutBtn.addEventListener("click", () => logout());
      navActions.append(chip, logoutBtn);
    }
  }

  function render() {
    renderNav();
    if (state.user && state.token) {
      authScreen.classList.add("hidden");
      dashboard.classList.remove("hidden");
      el("open-add-vehicle").hidden = !state.user.is_admin;
      renderVehicles();
    } else {
      authScreen.classList.remove("hidden");
      dashboard.classList.add("hidden");
    }
  }

  // ============================================================
  // Wire up events
  // ============================================================
  function initAuthTabs() {
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.dataset.tab;
        el("login-form").classList.toggle("hidden", target !== "login");
        el("register-form").classList.toggle("hidden", target !== "register");
      });
    });
  }

  function init() {
    initAuthTabs();
    el("login-form").addEventListener("submit", handleLogin);
    el("register-form").addEventListener("submit", handleRegister);
    el("open-add-vehicle").addEventListener("click", () => openVehicleModal());
    el("close-modal").addEventListener("click", closeVehicleModal);
    el("cancel-modal").addEventListener("click", closeVehicleModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeVehicleModal(); });
    vehicleForm.addEventListener("submit", handleVehicleFormSubmit);
    el("apply-filters").addEventListener("click", () => loadVehicles(currentFilters()));
    el("clear-filters").addEventListener("click", clearFilters);

    render();
    if (state.user && state.token) loadVehicles();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
