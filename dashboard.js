const STORAGE_KEYS = {
  USERS: "bem_petra_users_v1",
  SESSION: "bem_petra_session_v1",
  PROJECTS: "bem_petra_projects_v1",
  TASKS: "bem_petra_tasks_v1",
  THEME: "bem_petra_theme_v1"
};

let currentUser = null;
let selectedProjectId = "ALL";
let confirmCallback = null;

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

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysDiff(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 1. TEMA GELAP / TERANG
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = saved === "dark" ? "☀️" : "🌙";
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  document.querySelectorAll(".theme-icon").forEach((el) => {
    el.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

// 2. PROTEKSI HALAMAN (Wajib Login)
function checkAuthGuard() {
  const session = getStore(STORAGE_KEYS.SESSION, null);
  const users = getStore(STORAGE_KEYS.USERS, []);
  const foundUser = session ? users.find((u) => u.id === session.userId) : null;

  if (!foundUser) {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.location.href = "home.html";
    return false;
  }

  currentUser = foundUser;
  $("user-display-name").textContent = currentUser.name;
  $("user-div-tag").textContent = currentUser.division || "BEM";
  return true;
}

// 3. AMBIL DATA MILIK USER LOGIN
function getUserProjects() {
  return getStore(STORAGE_KEYS.PROJECTS, []).filter((p) => p.userId === currentUser.id);
}

function getUserTasks() {
  return getStore(STORAGE_KEYS.TASKS, []).filter((t) => t.userId === currentUser.id);
}

// 4. RENDER DASHBOARD (Statistik, Proyek, Kanban Tugas)
function renderDashboard() {
  const projects = getUserProjects();
  const tasks = getUserTasks();

  if (selectedProjectId !== "ALL" && !projects.some((p) => p.id === selectedProjectId)) {
    selectedProjectId = "ALL";
  }

  // Update 4 Kartu Statistik
  const activeProj = projects.filter((p) => p.status !== "Selesai").length;
  const todoCount = tasks.filter((t) => t.status === "To-do").length;
  const progCount = tasks.filter((t) => t.status === "In-Progress").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;
  const rate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  $("stat-total-projects").textContent = projects.length;
  $("stat-active-projects").textContent = `${activeProj} proyek aktif`;
  $("stat-todo").textContent = todoCount;
  $("stat-progress").textContent = progCount;
  $("stat-done").textContent = doneCount;
  $("stat-completion-rate").textContent = `${rate}% selesai`;
  $("all-tasks-pill").textContent = tasks.length;

  renderProjectsList(projects, tasks);
  renderKanbanBoard(projects, tasks);
}

function renderProjectsList(projects, tasks) {
  $("select-all-projects-btn").classList.toggle("active", selectedProjectId === "ALL");
  const listEl = $("projects-list");

  if (projects.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Belum ada proyek.<br/>Klik <strong>+ Proyek</strong> untuk memulai!</div>`;
    return;
  }

  listEl.innerHTML = projects
    .map((p) => {
      const count = tasks.filter((t) => t.projectId === p.id).length;
      const isSelected = selectedProjectId === p.id;
      const badge = p.status === "Selesai" ? "pill-sage" : p.status === "Berjalan" ? "pill-teal" : "pill-amber";

      return `
        <div class="project-card ${isSelected ? "active" : ""}" data-project-id="${p.id}">
          <div class="project-card-top">
            <div class="project-card-title">${escapeHTML(p.name)}</div>
            <span class="pill-tag ${badge}">${escapeHTML(p.status)}</span>
          </div>
          <p class="project-card-desc">${escapeHTML(p.description)}</p>
          <div class="project-card-footer">
            <span>📅 ${formatDateID(p.deadline)} • ${count} tugas</span>
            <div class="card-icon-actions">
              <button type="button" class="mini-btn edit-proj-btn" data-id="${p.id}">Edit</button>
              <button type="button" class="mini-btn del del-proj-btn" data-id="${p.id}">Hapus</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      selectedProjectId = card.dataset.projectId;
      renderDashboard();
    });
  });

  listEl.querySelectorAll(".edit-proj-btn").forEach((btn) => {
    btn.addEventListener("click", () => openProjectModal(btn.dataset.id));
  });

  listEl.querySelectorAll(".del-proj-btn").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteProject(btn.dataset.id));
  });
}

function renderKanbanBoard(projects, tasks) {
  const projMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  if (selectedProjectId === "ALL") {
    $("active-project-badge").textContent = "SEMUA PROYEK";
    $("active-project-title").textContent = "Semua Tugas Harian";
  } else {
    const activeProj = projects.find((p) => p.id === selectedProjectId);
    $("active-project-badge").textContent = activeProj ? activeProj.status.toUpperCase() : "PROYEK";
    $("active-project-title").textContent = activeProj ? activeProj.name : "Daftar Tugas";
  }

  const filtered = tasks.filter((t) => selectedProjectId === "ALL" || t.projectId === selectedProjectId);

  const columns = [
    { status: "To-do", zone: "zone-todo", count: "col-count-todo" },
    { status: "In-Progress", zone: "zone-progress", count: "col-count-progress" },
    { status: "Done", zone: "zone-done", count: "col-count-done" }
  ];

  columns.forEach(({ status, zone, count }) => {
    const items = filtered.filter((t) => t.status === status);
    $(count).textContent = items.length;
    const zoneEl = $(zone);

    if (items.length === 0) {
      zoneEl.innerHTML = `<div class="empty-state">Kosong (${status})</div>`;
    } else {
      zoneEl.innerHTML = items
        .map((t) => {
          const isUrgent = t.status !== "Done" && getDaysDiff(t.deadline) <= 3;
          return `
            <article class="task-card" draggable="true" data-task-id="${t.id}">
              <div class="task-card-top">
                <span class="task-project-tag">${escapeHTML(projMap[t.projectId] || "Proyek")}</span>
                <div class="card-icon-actions">
                  <button type="button" class="mini-btn edit-task-btn" data-id="${t.id}">Edit</button>
                  <button type="button" class="mini-btn del del-task-btn" data-id="${t.id}">Hapus</button>
                </div>
              </div>
              <div class="task-title">${escapeHTML(t.title)}</div>
              <p class="task-desc">${escapeHTML(t.description)}</p>
              <div class="task-footer">
                <span class="deadline-pill ${isUrgent ? "urgent" : ""}">📅 ${formatDateID(t.deadline)}</span>
                <select class="status-quick-select" data-id="${t.id}">
                  <option value="To-do" ${t.status === "To-do" ? "selected" : ""}>To-do</option>
                  <option value="In-Progress" ${t.status === "In-Progress" ? "selected" : ""}>In-Progress</option>
                  <option value="Done" ${t.status === "Done" ? "selected" : ""}>Done</option>
                </select>
              </div>
            </article>
          `;
        })
        .join("");
    }
  });

  bindTaskCardEvents();
}

// 5. EVENT KARTU TUGAS & HTML5 DRAG-AND-DROP
function bindTaskCardEvents() {
  document.querySelectorAll(".edit-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => openTaskModal(btn.dataset.id));
  });

  document.querySelectorAll(".del-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteTask(btn.dataset.id));
  });

  document.querySelectorAll(".status-quick-select").forEach((sel) => {
    sel.addEventListener("change", (e) => updateTaskStatus(sel.dataset.id, e.target.value));
  });

  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.dataset.taskId);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".kanban-dropzone").forEach((z) => z.classList.remove("drag-over"));
    });
  });
}

function initKanbanDropzones() {
  document.querySelectorAll(".kanban-dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const taskId = e.dataTransfer.getData("text/plain");
      const newStatus = zone.dataset.status;
      if (taskId && newStatus) updateTaskStatus(taskId, newStatus);
    });
  });
}

function updateTaskStatus(taskId, newStatus) {
  const allTasks = getStore(STORAGE_KEYS.TASKS, []);
  const idx = allTasks.findIndex((t) => t.id === taskId && t.userId === currentUser.id);
  if (idx !== -1 && allTasks[idx].status !== newStatus) {
    allTasks[idx].status = newStatus;
    setStore(STORAGE_KEYS.TASKS, allTasks);
    showToast(`Tugas dipindahkan ke "${newStatus}"`, "success");
    renderDashboard();
  }
}

// 6. CRUD PROYEK
function clearFormErrors(formEl) {
  formEl.querySelectorAll(".error-msg").forEach((el) => (el.textContent = ""));
  formEl.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
}

function setFieldError(inputId, errId, msg) {
  $(inputId).classList.add("input-error");
  $(errId).textContent = msg;
}

function openProjectModal(projectId = null) {
  const form = $("project-form");
  clearFormErrors(form);
  form.reset();

  if (projectId) {
    const proj = getUserProjects().find((p) => p.id === projectId);
    if (!proj) return;
    $("project-modal-title").textContent = "Edit Proyek";
    $("project-id").value = proj.id;
    $("project-name").value = proj.name;
    $("project-desc").value = proj.description;
    $("project-deadline").value = proj.deadline;
    $("project-status").value = proj.status;
  } else {
    $("project-modal-title").textContent = "Tambah Proyek Baru";
    $("project-id").value = "";
  }
  $("project-modal").classList.remove("hidden");
}

function handleSaveProject(e) {
  e.preventDefault();
  const form = $("project-form");
  clearFormErrors(form);

  const id = $("project-id").value;
  const name = $("project-name").value.trim();
  const description = $("project-desc").value.trim();
  const deadline = $("project-deadline").value;
  const status = $("project-status").value;

  let valid = true;
  if (name.length < 3) {
    setFieldError("project-name", "project-name-err", "Nama proyek minimal 3 karakter.");
    valid = false;
  }
  if (description.length < 5) {
    setFieldError("project-desc", "project-desc-err", "Deskripsi proyek minimal 5 karakter.");
    valid = false;
  }
  if (!deadline) {
    setFieldError("project-deadline", "project-deadline-err", "Tanggal deadline wajib dipilih.");
    valid = false;
  }
  if (!valid) return;

  const allProjects = getStore(STORAGE_KEYS.PROJECTS, []);
  if (id) {
    const idx = allProjects.findIndex((p) => p.id === id && p.userId === currentUser.id);
    if (idx !== -1) allProjects[idx] = { ...allProjects[idx], name, description, deadline, status };
    showToast("Proyek diperbarui!", "success");
  } else {
    const newProj = { id: generateId("proj"), userId: currentUser.id, name, description, deadline, status };
    allProjects.push(newProj);
    selectedProjectId = newProj.id;
    showToast("Proyek baru ditambahkan!", "success");
  }

  setStore(STORAGE_KEYS.PROJECTS, allProjects);
  $("project-modal").classList.add("hidden");
  renderDashboard();
}

function confirmDeleteProject(projectId) {
  const proj = getUserProjects().find((p) => p.id === projectId);
  if (!proj) return;
  const taskCount = getUserTasks().filter((t) => t.projectId === projectId).length;

  openConfirmModal(
    "Hapus Proyek?",
    `Proyek "${proj.name}" beserta ${taskCount} tugas di dalamnya akan ikut terhapus. Lanjutkan?`,
    () => {
      setStore(STORAGE_KEYS.PROJECTS, getStore(STORAGE_KEYS.PROJECTS, []).filter((p) => p.id !== projectId));
      setStore(STORAGE_KEYS.TASKS, getStore(STORAGE_KEYS.TASKS, []).filter((t) => t.projectId !== projectId));
      if (selectedProjectId === projectId) selectedProjectId = "ALL";
      showToast("Proyek & tugas di dalamnya dihapus.", "success");
      renderDashboard();
    }
  );
}

// 7. CRUD TUGAS
function openTaskModal(taskId = null) {
  const projects = getUserProjects();
  if (projects.length === 0) {
    showToast("Buat minimal 1 proyek terlebih dahulu!", "error");
    openProjectModal();
    return;
  }

  const form = $("task-form");
  clearFormErrors(form);
  form.reset();

  const projSelect = $("task-project-id");
  projSelect.innerHTML = projects.map((p) => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("");

  if (taskId) {
    const task = getUserTasks().find((t) => t.id === taskId);
    if (!task) return;
    $("task-modal-title").textContent = "Edit Tugas";
    $("task-id").value = task.id;
    projSelect.value = task.projectId;
    $("task-title").value = task.title;
    $("task-desc").value = task.description;
    $("task-deadline").value = task.deadline;
    $("task-status").value = task.status;
  } else {
    $("task-modal-title").textContent = "Tambah Tugas Baru";
    $("task-id").value = "";
    if (selectedProjectId !== "ALL") projSelect.value = selectedProjectId;
  }

  $("task-modal").classList.remove("hidden");
}

function handleSaveTask(e) {
  e.preventDefault();
  const form = $("task-form");
  clearFormErrors(form);

  const id = $("task-id").value;
  const projectId = $("task-project-id").value;
  const title = $("task-title").value.trim();
  const description = $("task-desc").value.trim();
  const deadline = $("task-deadline").value;
  const status = $("task-status").value;

  let valid = true;
  if (!projectId) {
    setFieldError("task-project-id", "task-project-err", "Pilih proyek terkait.");
    valid = false;
  }
  if (title.length < 3) {
    setFieldError("task-title", "task-title-err", "Judul tugas minimal 3 karakter.");
    valid = false;
  }
  if (description.length < 3) {
    setFieldError("task-desc", "task-desc-err", "Deskripsi tugas wajib diisi.");
    valid = false;
  }
  if (!deadline) {
    setFieldError("task-deadline", "task-deadline-err", "Deadline tugas wajib diisi.");
    valid = false;
  }
  if (!valid) return;

  const allTasks = getStore(STORAGE_KEYS.TASKS, []);
  if (id) {
    const idx = allTasks.findIndex((t) => t.id === id && t.userId === currentUser.id);
    if (idx !== -1) allTasks[idx] = { ...allTasks[idx], projectId, title, description, deadline, status };
  } else {
    allTasks.push({ id: generateId("task"), userId: currentUser.id, projectId, title, description, deadline, status });
  }

  setStore(STORAGE_KEYS.TASKS, allTasks);
  showToast(id ? "Tugas diperbarui!" : "Tugas baru ditambahkan!", "success");
  $("task-modal").classList.add("hidden");
  renderDashboard();
}

function confirmDeleteTask(taskId) {
  const task = getUserTasks().find((t) => t.id === taskId);
  if (!task) return;

  openConfirmModal("Hapus Tugas?", `Yakin ingin menghapus tugas "${task.title}"?`, () => {
    setStore(STORAGE_KEYS.TASKS, getStore(STORAGE_KEYS.TASKS, []).filter((t) => t.id !== taskId));
    showToast("Tugas berhasil dihapus.", "success");
    renderDashboard();
  });
}

function openConfirmModal(title, message, onConfirm) {
  $("confirm-title").textContent = title;
  $("confirm-message").textContent = message;
  confirmCallback = onConfirm;
  $("confirm-modal").classList.remove("hidden");
}

// 8. INISIALISASI
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  if (!checkAuthGuard()) return;

  $("dash-theme-toggle").addEventListener("click", toggleTheme);
  $("logout-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.location.href = "home.html";
  });

  $("open-project-modal-btn").addEventListener("click", () => openProjectModal());
  $("project-form").addEventListener("submit", handleSaveProject);

  $("open-task-modal-btn").addEventListener("click", () => openTaskModal());
  $("task-form").addEventListener("submit", handleSaveTask);

  $("select-all-projects-btn").addEventListener("click", () => {
    selectedProjectId = "ALL";
    renderDashboard();
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => $(btn.dataset.close).classList.add("hidden"));
  });

  $("confirm-cancel-btn").addEventListener("click", () => {
    $("confirm-modal").classList.add("hidden");
    confirmCallback = null;
  });

  $("confirm-ok-btn").addEventListener("click", () => {
    $("confirm-modal").classList.add("hidden");
    if (typeof confirmCallback === "function") confirmCallback();
    confirmCallback = null;
  });

  initKanbanDropzones();
  renderDashboard();
});
