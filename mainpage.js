import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import { initializeApp, getApps } from
  "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvCQRDfvdu47lNCvXnndJXfZ81btgmUh",
  authDomain: "track-work-bd526.firebaseapp.com",
  projectId: "track-work-bd526",
  storageBucket: "track-work-bd526.firebasestorage.app",
  messagingSenderId: "212090415578",
  appId: "15578:web:601:2120904ba96e8b0db889d8738e3"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const auth = getAuth(app);

const $ = (id) => document.getElementById(id);

let tasks = [];
let activeFilter = "all";
let currentUser = null;
let editingId = null;

const storageKey = () => `trackwork_tasks_${currentUser.uid}`;

function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    if (!Array.isArray(tasks)) tasks = [];
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey(), JSON.stringify(tasks));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function statusLabel(status) {
  return {
    todo: "To Do",
    progress: "In Progress",
    completed: "Completed"
  }[status] || "To Do";
}

function formatDate(date) {
  if (!date) return "No deadline";
  return new Date(date + "T00:00:00").toLocaleDateString(
    "en-PH",
    { month: "short", day: "numeric", year: "numeric" }
  );
}

function renderStats() {
  $("totalCount").textContent = tasks.length;
  $("todoCount").textContent =
    tasks.filter(t => t.status === "todo").length;
  $("progressCount").textContent =
    tasks.filter(t => t.status === "progress").length;
  $("completedCount").textContent =
    tasks.filter(t => t.status === "completed").length;
}

function renderTasks() {
  renderStats();

  const heading = {
    all: "My Tasks",
    todo: "Tasks To Do",
    progress: "In Progress",
    completed: "Completed Tasks"
  };

  $("taskHeading").textContent = heading[activeFilter];
  $("pageTitle").textContent =
    activeFilter === "all" ? "Dashboard" : heading[activeFilter];

  let visibleTasks = tasks.filter(task =>
    activeFilter === "all" || task.status === activeFilter
  );

  const sort = $("sortTasks").value;

  if (sort === "deadline") {
    visibleTasks.sort((a, b) =>
      (a.deadline || "9999-12-31").localeCompare(
        b.deadline || "9999-12-31"
      )
    );
  } else if (sort === "priority") {
    const rank = { High: 0, Medium: 1, Low: 2 };
    visibleTasks.sort((a, b) =>
      rank[a.priority] - rank[b.priority]
    );
  } else {
    visibleTasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!visibleTasks.length) {
    $("taskList").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No tasks yet</h3>
        <p>Add a new task to start organizing your work.</p>
        <button class="primary-btn" id="emptyAddBtn">＋ Create Task</button>
      </div>`;
    $("emptyAddBtn").addEventListener("click", openNewTask);
    return;
  }

  $("taskList").innerHTML = visibleTasks.map(task => `
    <article class="task-card">
      <div class="task-top">
        <h3>${escapeHTML(task.title)}</h3>
        <span class="pill status-${task.status}">
          ${statusLabel(task.status)}
        </span>
      </div>

      <p class="task-description">${
        escapeHTML(task.description || "No description provided.")
      }</p>

      <div>
        <span class="pill priority-${task.priority.toLowerCase()}">
          ${escapeHTML(task.priority)} Priority
        </span>
      </div>

      <div class="task-meta">
        <span>◷ Due: ${formatDate(task.deadline)}</span>
        <span>Created: ${formatDate(task.createdDate)}</span>
      </div>

      <div class="task-actions">
        <button class="secondary-btn edit-btn"
          data-id="${task.id}">Edit</button>

        <select class="status-select" data-id="${task.id}"
          aria-label="Change task status">
          <option value="todo" ${task.status === "todo" ? "selected" : ""}>
            To Do
          </option>
          <option value="progress" ${task.status === "progress" ? "selected" : ""}>
            In Progress
          </option>
          <option value="completed" ${task.status === "completed" ? "selected" : ""}>
            Completed
          </option>
        </select>

        <button class="delete-btn" data-id="${task.id}"
          aria-label="Delete task">✕</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", () => {
      const task = tasks.find(t => t.id === select.dataset.id);
      if (!task) return;
      task.status = select.value;
      saveTasks();
      renderTasks();
    });
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", () => {
      if (!confirm("Delete this task?")) return;
      tasks = tasks.filter(t => t.id !== button.dataset.id);
      saveTasks();
      renderTasks();
    });
  });

  document.querySelectorAll(".edit-btn").forEach(button => {
    button.addEventListener("click", () => {
      editTask(button.dataset.id);
    });
  });
}

function openNewTask() {
  editingId = null;
  $("taskForm").reset();
  $("modalTitle").textContent = "Create a Task";
  $("taskModal").classList.remove("hidden");
  $("taskTitle").focus();
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId = id;
  $("modalTitle").textContent = "Edit Task";
  $("taskTitle").value = task.title;
  $("taskDescription").value = task.description || "";
  $("taskDeadline").value = task.deadline;
  $("taskPriority").value = task.priority;
  $("taskStatus").value = task.status;
  $("taskModal").classList.remove("hidden");
}

function closeModal() {
  $("taskModal").classList.add("hidden");
  editingId = null;
}

$("openTaskBtn").addEventListener("click", openNewTask);
$("closeModalBtn").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("sortTasks").addEventListener("change", renderTasks);

$("taskModal").addEventListener("click", event => {
  if (event.target === $("taskModal")) closeModal();
});

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const deadline = $("taskDeadline").value;

  if (!title || !deadline) {
    alert("Please enter a task title and deadline.");
    return;
  }

  const now = Date.now();
  const existing = tasks.find(t => t.id === editingId);

  const taskData = {
    id: editingId || crypto.randomUUID(),
    title,
    description: $("taskDescription").value.trim(),
    deadline,
    priority: $("taskPriority").value,
    status: $("taskStatus").value,
    createdAt: existing?.createdAt || now,
    createdDate: existing?.createdDate ||
      new Date().toISOString().slice(0, 10)
  };

  if (editingId) {
    tasks = tasks.map(t => t.id === editingId ? taskData : t);
  } else {
    tasks.push(taskData);
  }

  saveTasks();
  closeModal();
  renderTasks();
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderTasks();
  });
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error(error);
    alert("Unable to sign out. Please try again.");
  }
});

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  $("userName").textContent =
    user.displayName || user.email || "My Account";
  $("userAvatar").textContent =
    (user.displayName || user.email || "U").charAt(0).toUpperCase();

  loadTasks();
  renderTasks();
});
