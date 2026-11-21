const STORAGE_KEYS = {
    USERS: "bem_petra_users_v1", 
    SESSION: "bem_petra_session_v1",
    THEME: "bem_petra_theme_v1"
};

const $ = (id) => document.getElementById(id);

function getStore(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// 1. MODE GELAP / TERANG (Simpan ke localStorage)
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = theme === "dark" ? "☀️" : "🌙";
  });
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// 2. BUAT AKUN DEMO OTOMATIS
function ensureDemoAccount() {
  const users = getStore(STORAGE_KEYS.USERS, []);
  const demoEmail = "intern@bem.petra.ac.id";

  if (!users.some((u) => u.email === demoEmail)) {
    users.push({
      id: "user_demo_bem",
      name: "Panitia Intern BEM",
      division: "CMD",
      email: demoEmail,
      password: "bem2026"
    });
    setStore(STORAGE_KEYS.USERS, users);
  }
}

// 3. VALIDASI FORM
function clearFormErrors(formEl) {
  formEl.querySelectorAll(".error-msg").forEach((el) => (el.textContent = ""));
  formEl.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
}

function setFieldError(inputId, errId, msg) {
  $(inputId).classList.add("input-error");
  $(errId).textContent = msg;
}

// 4. PROSES LOGIN
function handleLogin(e) {
  e.preventDefault();
  const form = $("login-form");
  clearFormErrors(form);

  const email = $("login-email").value.trim().toLowerCase();
  const password = $("login-password").value;
  let valid = true;

  if (!email) {
    setFieldError("login-email", "login-email-err", "Email atau NRP wajib diisi.");
    valid = false;
  }
  if (!password || password.length < 6) {
    setFieldError("login-password", "login-password-err", "Kata sandi minimal 6 karakter.");
    valid = false;
  }
  if (!valid) return;

  const users = getStore(STORAGE_KEYS.USERS, []);
  const user = users.find((u) => u.email.toLowerCase() === email && u.password === password);

  if (!user) {
    setFieldError("login-password", "login-password-err", "Email/NRP atau kata sandi salah.");
    return;
  }

  // Simpan sesi login ke localStorage
  setStore(STORAGE_KEYS.SESSION, { userId: user.id, loginAt: Date.now() });
  window.location.href = "dashboard.html";

}

// 5. PROSES REGISTER
function handleRegister(e) {
  e.preventDefault();
  const form = $("register-form");
  clearFormErrors(form);

  const name = $("reg-name").value.trim();
  const division = $("reg-division").value;
  const email = $("reg-email").value.trim().toLowerCase();
  const password = $("reg-password").value;
  let valid = true;

  if (name.length < 3) {
    setFieldError("reg-name", "reg-name-err", "Nama lengkap minimal 3 karakter.");
    valid = false;
  }
  if (!email || email.length < 4) {
    setFieldError("reg-email", "reg-email-err", "Masukkan email atau NRP yang valid.");
    valid = false;
  }
  if (password.length < 6) {
    setFieldError("reg-password", "reg-password-err", "Kata sandi minimal 6 karakter.");
    valid = false;
  }
  if (!valid) return;

  const users = getStore(STORAGE_KEYS.USERS, []);
  if (users.some((u) => u.email.toLowerCase() === email)) {
    setFieldError("reg-email", "reg-email-err", "Email/NRP ini sudah terdaftar.");
    return;
  }

  const newUser = {
    id: "user_" + Date.now(),
    name,
    division,
    email,
    password
  };

  users.push(newUser);
  setStore(STORAGE_KEYS.USERS, users);
  setStore(STORAGE_KEYS.SESSION, { userId: newUser.id, loginAt: Date.now() });
  window.location.href = "dashboard.html";
}

// 6. JALANKAN SAAT HALAMAN DIBUKA
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  ensureDemoAccount();

    if (getStore(STORAGE_KEYS.SESSION, null)) {
    window.location.href = "dashboard.html";
    return;
    }
  // Pindah tab Masuk <-> Daftar Akun
  $("tab-login").addEventListener("click", () => {
    $("tab-login").classList.add("active");
    $("tab-register").classList.remove("active");
    $("login-form").classList.remove("hidden");
    $("register-form").classList.add("hidden");
  });

  $("tab-register").addEventListener("click", () => {
    $("tab-register").classList.add("active");
    $("tab-login").classList.remove("active");
    $("register-form").classList.remove("hidden");
    $("login-form").classList.add("hidden");
  });

  // Tombol isi akun demo otomatis
  $("fill-demo-btn").addEventListener("click", () => {
    $("login-email").value = "intern@bem.petra.ac.id";
    $("login-password").value = "bem2026";
  });

  // Submit form & tombol tema
  $("login-form").addEventListener("submit", handleLogin);
  $("register-form").addEventListener("submit", handleRegister);
  $("auth-theme-toggle").addEventListener("click", toggleTheme);
});