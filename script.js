/* =====================================
   BELAJAR | APPLICATION JAVASCRIPT
   Demo authentication + localStorage (no backend)
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ---------- CONSTANTS ----------
  const USERS_KEY = "studyTrackUsers";
  const ADMIN = { name: "Demo Student", username: "admin", password: "1234", role: "admin" };
  const GRADES = { "A+": 4, "A": 4, "A-": 3.67, "B+": 3.33, "B": 3, "B-": 2.67, "C+": 2.33, "C": 2, "C-": 1.67, "D": 1, "F": 0 };
  const STUDY_DAYS = 14; // show "study standby" banner this many days before an exam
  const range = (n, from = 1) => Array.from({ length: n }, (_, i) => i + from);

  // ---------- STATE ----------
  let currentUser = null;
  let courses = [];
  let tasks = [];
  let events = [];
  let meta = { totalSems: 6 };
  let charts = {};

  // ---------- STORAGE ----------
  const getUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; } };
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const key = (name, user) => "st" + name + "_" + user.toLowerCase();

  function saveData() {
    if (!currentUser) return;
    const u = currentUser.username;
    localStorage.setItem(key("Courses", u), JSON.stringify(courses));
    localStorage.setItem(key("Tasks", u), JSON.stringify(tasks));
    localStorage.setItem(key("Events", u), JSON.stringify(events));
    localStorage.setItem(key("Meta", u), JSON.stringify(meta));
  }

  function loadData(u) {
    const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(key(name, u))) ?? fallback; } catch { return fallback; } };
    courses = read("Courses", []);
    tasks = read("Tasks", []).map(t => ({ mode: "Individual", priority: "Medium", ...t })); // older items get defaults
    meta = read("Meta", { totalSems: 6 });
    events = read("Events", []);
  }

  // YYYY-MM-DD in local time, offset by N days
  function makeDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Whole days from today until a date (negative = past)
  const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); // days from a to b
  const daysUntil = (dateStr) => dayDiff(makeDate(0), dateStr);
  const pad = (n) => String(n).padStart(2, "0");

  const escapeHTML = (v) => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // ---------- DEMO DATA (admin account) ----------
  function sampleCourses() {
    const sems = [
      [["CSC101", "Programming Fundamentals", 4, "A-"], ["MAT101", "Mathematics for Computing", 3, "B+"], ["ENG101", "English Communication", 2, "A"], ["CSC102", "Computer Systems", 3, "B"], ["ETH101", "Ethics & Society", 2, "A-"]],
      [["CSC201", "Data Structures", 4, "B+"], ["MAT201", "Statistics", 3, "B"], ["IMS201", "Web Basics", 3, "A"], ["CSC202", "Database Fundamentals", 3, "A-"], ["ENG201", "Academic Writing", 2, "B+"]],
      [["CSC301", "Object-Oriented Programming", 4, "A-"], ["IMS301", "Systems Analysis", 3, "B+"], ["CSC302", "Networking", 3, "B"], ["MAT301", "Discrete Mathematics", 3, "A-"], ["ENT301", "Entrepreneurship", 2, "A"]],
      [["IMS566", "Advanced Web Design & CMS", 3, ""], ["CSC401", "Software Engineering", 4, ""], ["IMS402", "Data Analytics", 3, ""], ["CSC402", "Mobile Computing", 3, ""], ["LAW401", "IT Law", 2, ""]]
    ];
    const out = [];
    sems.forEach((list, i) => list.forEach(([code, name, credit, grade]) =>
      out.push({ id: "c" + out.length, code, name, credit, grade, semester: i + 1 })));
    return out;
  }

  const GROUP_TITLES = ["Data Analytics Case Study", "Mobile App Prototype"];

  // Demo semester: currently around week 8, mid-sem break in two weeks
  function sampleMeta() {
    return { semNo: 4, semStart: makeDate(-49), semEnd: makeDate(56), midStart: makeDate(14), midEnd: makeDate(20) };
  }

  // Demo priority: exams and IMS566 are High, essays Low, the rest Medium
  const samplePriority = (title) => /IMS566|Exam|Test/.test(title) ? "High" : /Essay/.test(title) ? "Low" : "Medium";

  function sampleEvents() {
    const rows = [
      ["Photography Club Meeting", "Club", 2, "20:00", "Plan the outing"],
      ["Cafe Shift (Part-time)", "Part-time", 3, "17:00", "5pm to 10pm"],
      ["Family Dinner", "Personal", 6, "19:30", ""],
      ["Career Talk: Tech Industry", "Program", 8, "10:00", "Dewan Kuliah 2"],
      ["Cafe Shift (Part-time)", "Part-time", 10, "17:00", ""],
      ["Committee Meeting", "Club", 12, "21:00", "Online via Teams"]
    ];
    return rows.map((r, i) => ({ id: "e" + i, title: r[0], category: r[1], date: makeDate(r[2]), time: r[3], notes: r[4] }));
  }

  function sampleTasks() {
    const rows = [
      ["IMS566 Individual Project", "IMS566", "Assignment", 4, "Pending"],
      ["Software Engineering Quiz 1", "CSC401", "Quiz", 6, "Pending"],
      ["Mid-Semester Test: Software Engineering", "CSC401", "Exam", 10, "Pending"],
      ["Data Analytics Case Study", "IMS402", "Assignment", 9, "Pending"],
      ["Mobile App Prototype", "CSC402", "Assignment", 13, "Pending"],
      ["IT Law Essay", "LAW401", "Assignment", -2, "Done"],
      ["Final Exam: IMS566", "IMS566", "Exam", 40, "Pending"]
    ];
    return rows.map((r, i) => ({ id: "t" + i, title: r[0], course: r[1], type: r[2], date: makeDate(r[3]), status: r[4], mode: GROUP_TITLES.includes(r[0]) ? "Group" : "Individual", priority: samplePriority(r[0]) }));
  }

  (function initialiseAdmin() {
    const users = getUsers();
    if (!users.some(u => u.username === ADMIN.username)) { users.push(ADMIN); saveUsers(users); }
    // Sample data only on first setup; later changes are preserved
    if (localStorage.getItem(key("Courses", "admin")) === null) {
      localStorage.setItem(key("Courses", "admin"), JSON.stringify(sampleCourses()));
      localStorage.setItem(key("Tasks", "admin"), JSON.stringify(sampleTasks()));
      localStorage.setItem(key("Meta", "admin"), JSON.stringify({ totalSems: 6, ...sampleMeta() }));
    }
    // Migration: older demo data had no semester dates or assignment mode
    const adminMeta = JSON.parse(localStorage.getItem(key("Meta", "admin")) || "{}");
    if (!adminMeta.semStart) localStorage.setItem(key("Meta", "admin"), JSON.stringify({ totalSems: 6, ...adminMeta, ...sampleMeta() }));
    const adminTasks = JSON.parse(localStorage.getItem(key("Tasks", "admin")) || "[]");
    if (adminTasks.length && (!adminTasks[0].mode || !adminTasks[0].priority)) {
      localStorage.setItem(key("Tasks", "admin"), JSON.stringify(adminTasks.map(t => ({
        ...t, mode: t.mode || (GROUP_TITLES.includes(t.title) ? "Group" : "Individual"), priority: t.priority || samplePriority(t.title)
      }))));
    }
    if (localStorage.getItem(key("Events", "admin")) === null) {
      localStorage.setItem(key("Events", "admin"), JSON.stringify(sampleEvents()));
    }
  })();

  // ---------- AUTHENTICATION ----------
  function showLogin() {
    $("loginSection").classList.remove("d-none");
    $("registerSection").classList.add("d-none");
    $("loginMessage").textContent = "";
    $("registerMessage").textContent = "";
  }

  function showRegister() {
    $("loginSection").classList.add("d-none");
    $("registerSection").classList.remove("d-none");
    $("loginMessage").textContent = "";
    $("registerMessage").textContent = "";
  }

  function login(username, password) {
    const user = getUsers().find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);
    if (!user) { $("loginMessage").textContent = "Incorrect username or password. Please try again."; return; }
    startSession(user);
  }

  function startSession(user) {
    currentUser = user;
    loadData(user.username);
    $("authPage").classList.add("d-none");
    $("appShell").classList.remove("d-none");
    $("profileName").textContent = user.name;
    $("profileUsername").textContent = "@" + user.username;
    $("userAvatar").textContent = user.name.charAt(0).toUpperCase();
    $("welcomeHeading").textContent = "Welcome back, " + user.name.split(" ")[0] + "!";
    $("loginMessage").textContent = "";
    showPage("dashboardPage");
    refreshAll();
  }

  function logout() {
    currentUser = null;
    courses = []; tasks = []; events = [];
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
    $("appShell").classList.add("d-none");
    $("authPage").classList.remove("d-none");
    $("loginForm").reset();
    $("sidebar").classList.remove("show");
    showLogin();
  }

  $("loginForm").addEventListener("submit", e => { e.preventDefault(); login($("loginUsername").value, $("loginPassword").value); });
  $("demoLoginButton").addEventListener("click", () => login(ADMIN.username, ADMIN.password));

  $("registerForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("registerName").value.trim();
    const username = $("registerUsername").value.trim();
    const password = $("registerPassword").value;
    const msg = (text) => { $("registerMessage").textContent = text; };

    if (username.length < 3) return msg("Username must contain at least 3 characters.");
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return msg("Use only letters, numbers and underscores for username.");
    if (password.length < 4) return msg("Password must contain at least 4 characters.");
    if (password !== $("confirmPassword").value) return msg("Passwords do not match.");

    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return msg("This username is already taken.");

    const newUser = { name, username, password, role: "user" };
    users.push(newUser);
    saveUsers(users);
    $("registerForm").reset();
    startSession(newUser); // new accounts start empty
  });

  $("showRegister").addEventListener("click", showRegister);
  $("showLogin").addEventListener("click", showLogin);
  $("sidebarLogout").addEventListener("click", logout);
  $("profileLogout").addEventListener("click", logout);

  // ---------- NAVIGATION ----------
  const pageTitles = { dashboardPage: "Dashboard", coursesPage: "Courses & Results", plannerPage: "Assignments & Exams", calendarPage: "Calendar" };

  function showPage(pageId) {
    document.querySelectorAll(".page-section").forEach(p => p.classList.add("d-none"));
    $(pageId).classList.remove("d-none");
    document.querySelectorAll(".side-nav .nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
    $("topbarPageTitle").textContent = pageTitles[pageId];
    $("sidebar").classList.remove("show");
  }

  document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); showPage(b.dataset.page); }));
  document.querySelectorAll("[data-go-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.goPage)));
  $("mobileMenuButton").addEventListener("click", () => $("sidebar").classList.toggle("show"));

  // ---------- THEME (light / dark / system) ----------
  function applyTheme(choice) {
    const theme = choice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("studyTrackTheme", choice);
    if (Object.keys(charts).length) drawCharts(); // redraw so chart text matches theme
  }
  document.querySelectorAll("[data-theme-choice]").forEach(b => b.addEventListener("click", () => applyTheme(b.dataset.themeChoice)));
  applyTheme(localStorage.getItem("studyTrackTheme") || "system");

  // ---------- FULLSCREEN ----------
  $("fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { alert("Fullscreen is not available in this browser."); }
  });

  // ---------- GPA HELPERS ----------
  const isGraded = (c) => Object.prototype.hasOwnProperty.call(GRADES, c.grade);

  // Credit-weighted GPA of a list of courses (null if nothing graded)
  function gpa(list) {
    const graded = list.filter(isGraded);
    const credits = graded.reduce((s, c) => s + c.credit, 0);
    return credits ? graded.reduce((s, c) => s + GRADES[c.grade] * c.credit, 0) / credits : null;
  }
  const fmt = (v) => v === null ? "–" : v.toFixed(2);
  const semesterCount = () => Math.max(meta.totalSems, ...courses.map(c => c.semester));

  // ---------- COURSES: MODAL + CRUD ----------
  const courseModal = new bootstrap.Modal($("courseModal"));

  $("cGrade").innerHTML = '<option value="">In progress</option>' + Object.keys(GRADES).map(g => `<option>${g}</option>`).join("");
  $("totalSems").innerHTML = range(9, 2).map(n => `<option value="${n}">${n} semesters</option>`).join("");

  function openCourseModal(course = null) {
    $("courseForm").reset();
    $("editingCourseId").value = course ? course.id : "";
    $("courseModalTitle").textContent = course ? "Edit Course" : "Add Course";
    $("cCode").value = course ? course.code : "";
    $("cName").value = course ? course.name : "";
    $("cCredit").value = course ? course.credit : 3;
    $("courseSem").value = course ? course.semester : ($("semFilter").value === "all" ? 1 : $("semFilter").value);
    $("cGrade").value = course ? course.grade : "";
    courseModal.show();
  }

  $("addCourseButton").addEventListener("click", () => openCourseModal());

  $("courseForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = $("editingCourseId").value;
    const course = {
      id: id || "c" + Date.now(),
      code: $("cCode").value.trim().toUpperCase(),
      name: $("cName").value.trim(),
      credit: Number($("cCredit").value),
      semester: Number($("courseSem").value),
      grade: $("cGrade").value
    };
    if (!course.code || !course.name || !(course.credit > 0)) return;
    courses = id ? courses.map(c => c.id === id ? course : c) : [...courses, course];
    courseModal.hide();
    refreshAll();
  });

  function renderCourses() {
    const sem = $("semFilter").value;
    const list = courses.filter(c => sem === "all" || c.semester === Number(sem))
      .sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));

    $("courseBody").innerHTML = list.map(c => `
      <tr>
        <td>${c.semester}</td>
        <td><b>${escapeHTML(c.code)}</b></td>
        <td>${escapeHTML(c.name)}</td>
        <td>${c.credit}</td>
        <td>${isGraded(c) ? `<span class="status-badge grade-badge">${c.grade}</span>` : '<span class="muted">In progress</span>'}</td>
        <td>${isGraded(c) ? GRADES[c.grade].toFixed(2) : "–"}</td>
        <td><div class="action-buttons">
          <button data-action="edit" data-id="${escapeHTML(c.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button data-action="delete" data-id="${escapeHTML(c.id)}" title="Delete"><i class="bi bi-trash"></i></button>
        </div></td>
      </tr>`).join("");
    $("courseEmpty").classList.toggle("d-none", list.length > 0);

    $("semSummary").textContent = (sem === "all" ? "" : `Semester ${sem} GPA: ${fmt(gpa(list))}  ·  `) + `CGPA: ${fmt(gpa(courses))}`;
  }

  $("courseBody").addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const course = courses.find(c => c.id === btn.dataset.id);
    if (!course) return;
    if (btn.dataset.action === "edit") openCourseModal(course);
    else if (confirm("Delete this course?")) { courses = courses.filter(c => c.id !== course.id); refreshAll(); }
  });

  // Semester dropdowns (filter + modal) follow the programme length
  function fillSemesterControls() {
    const n = semesterCount();
    const current = $("semFilter").value || "all";
    $("semFilter").innerHTML = '<option value="all">All semesters</option>' + range(n).map(i => `<option value="${i}">Semester ${i}</option>`).join("");
    $("semFilter").value = [...$("semFilter").options].some(o => o.value === current) ? current : "all";
    $("courseSem").innerHTML = range(n).map(i => `<option value="${i}">Semester ${i}</option>`).join("");
    $("totalSems").value = meta.totalSems;
  }

  $("semFilter").addEventListener("change", renderCourses);
  $("totalSems").addEventListener("change", () => { meta.totalSems = Number($("totalSems").value); refreshAll(); });

  // ---------- ASSIGNMENTS & EXAMS: MODAL + CRUD ----------
  const taskModal = new bootstrap.Modal($("taskModal"));

  function openTaskModal(task = null) {
    $("taskForm").reset();
    $("editingTaskId").value = task ? task.id : "";
    $("taskModalTitle").textContent = task ? "Edit Item" : "Add Item";
    $("tTitle").value = task ? task.title : "";
    $("tCourse").value = task ? task.course : "";
    $("tType").value = task ? task.type : "Assignment";
    $("tMode").value = task ? task.mode : "Individual";
    $("tPriority").value = task ? task.priority : "Medium";
    $("tDate").value = task ? task.date : makeDate(7);
    $("tStatus").value = task ? task.status : "Pending";
    taskModal.show();
  }

  $("addTaskButton").addEventListener("click", () => openTaskModal());

  $("taskForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = $("editingTaskId").value;
    const task = {
      id: id || "t" + Date.now(),
      title: $("tTitle").value.trim(),
      course: $("tCourse").value.trim().toUpperCase(),
      type: $("tType").value,
      mode: $("tMode").value,
      priority: $("tPriority").value,
      date: $("tDate").value,
      status: $("tStatus").value
    };
    if (!task.title || !task.course || !task.date) return;
    tasks = id ? tasks.map(t => t.id === id ? task : t) : [...tasks, task];
    taskModal.hide();
    refreshAll();
  });

  // Human-friendly countdown label
  function countdown(task) {
    if (task.status === "Done") return "";
    const d = daysUntil(task.date);
    const text = d < 0 ? `Overdue by ${-d} day${d === -1 ? "" : "s"}` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`;
    return `<div class="countdown ${d <= 3 ? "urgent" : ""}">${text}</div>`;
  }

  const typeBadge = (t) => `<span class="status-badge type-${t.type.toLowerCase()}">${t.type}</span>`;
  const priorityBadge = (t) => `<span class="status-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>`;

  // Sorting: finished items always go last; the rest follow the chosen order
  const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
  function taskSorter() {
    const order = $("sortSelect").value;
    return (a, b) => {
      if ((a.status === "Done") !== (b.status === "Done")) return a.status === "Done" ? 1 : -1;
      const byDate = a.date.localeCompare(b.date);
      if (order === "deadline-desc") return -byDate;
      if (order === "priority-high") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDate;
      if (order === "priority-low") return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || byDate;
      if (order === "course") return a.course.localeCompare(b.course) || byDate;
      return byDate;
    };
  }

  function renderTasks() {
    const type = $("typeFilter").value;
    const status = $("statusFilter").value;
    const mode = $("modeFilter").value;
    const list = tasks.filter(t => (type === "all" || t.type === type) && (status === "all" || t.status === status) && (mode === "all" || t.mode === mode))
      .sort(taskSorter());

    $("taskBody").innerHTML = list.map(t => `
      <tr>
        <td><div class="task-name-cell">${escapeHTML(t.title)}</div><div class="task-sub">${escapeHTML(t.course)} · ${t.mode}</div></td>
        <td>${typeBadge(t)}</td>
        <td>${priorityBadge(t)}</td>
        <td>${formatDate(t.date)}${countdown(t)}</td>
        <td><span class="status-badge state-${t.status.toLowerCase()}">${t.status}</span></td>
        <td><div class="action-buttons">
          <button data-action="toggle" data-id="${escapeHTML(t.id)}" title="Mark done / pending"><i class="bi bi-check2-circle"></i></button>
          <button data-action="edit" data-id="${escapeHTML(t.id)}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button data-action="delete" data-id="${escapeHTML(t.id)}" title="Delete"><i class="bi bi-trash"></i></button>
        </div></td>
      </tr>`).join("");
    $("taskEmpty").classList.toggle("d-none", list.length > 0);
    $("courseList").innerHTML = [...new Set(courses.map(c => c.code))].map(c => `<option value="${escapeHTML(c)}">`).join("");
  }

  $("taskBody").addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const task = tasks.find(t => t.id === btn.dataset.id);
    if (!task) return;
    if (btn.dataset.action === "edit") openTaskModal(task);
    else if (btn.dataset.action === "toggle") { task.status = task.status === "Done" ? "Pending" : "Done"; refreshAll(); }
    else if (confirm("Delete this item?")) { tasks = tasks.filter(t => t.id !== task.id); refreshAll(); }
  });

  ["typeFilter", "statusFilter", "modeFilter", "sortSelect"].forEach(id => $(id).addEventListener("change", renderTasks));

  // ---------- SEMESTER: detect start / end, current week and phase ----------
  const semesterModal = new bootstrap.Modal($("semesterModal"));

  function semesterInfo() {
    if (!meta.semStart || !meta.semEnd) return null;
    const today = makeDate(0);
    const info = { totalWeeks: Math.ceil((dayDiff(meta.semStart, meta.semEnd) + 1) / 7), week: 0, phase: "session", label: "" };
    if (today < meta.semStart) {
      info.phase = "upcoming"; info.label = `Starts in ${dayDiff(today, meta.semStart)} day(s)`;
    } else if (today > meta.semEnd) {
      info.phase = "ended"; info.label = `Ended ${dayDiff(meta.semEnd, today)} day(s) ago`;
    } else {
      info.week = Math.floor(dayDiff(meta.semStart, today) / 7) + 1;
      const onBreak = meta.midStart && meta.midEnd && today >= meta.midStart && today <= meta.midEnd;
      info.phase = onBreak ? "break" : "session";
      info.label = `${dayDiff(today, meta.semEnd)} day(s) left`;
    }
    return info;
  }

  function renderSemesterCard() {
    const info = semesterInfo();
    if (!info) {
      $("semesterCard").innerHTML = `<div class="sem-row"><div><p class="eyebrow">CURRENT SEMESTER</p><h2>Set your semester dates</h2>
        <p class="muted mb-0">Add the start and end dates to see which week you are in.</p></div>
        <button class="btn btn-primary" id="editSemesterButton">Set dates</button></div>`;
      return;
    }
    const phases = { session: ["In session", "phase-session"], break: ["Mid-sem break", "phase-break"], ended: ["Semester break", "phase-ended"], upcoming: ["Not started", "phase-upcoming"] };
    const [phaseText, phaseClass] = phases[info.phase];
    const total = dayDiff(meta.semStart, meta.semEnd) + 1;
    const pct = Math.max(0, Math.min(100, Math.round((dayDiff(meta.semStart, makeDate(0)) + 1) / total * 100)));
    const midIn = meta.midStart ? dayDiff(makeDate(0), meta.midStart) : -1;
    const extra = midIn > 0 ? ` · Mid-sem break in ${midIn} day(s)` : "";
    $("semesterCard").innerHTML = `
      <div class="sem-row">
        <div>
          <p class="eyebrow">SEMESTER ${meta.semNo || ""}</p>
          <div class="sem-week">${info.week ? `Week ${info.week} <span>of ${info.totalWeeks}</span>` : phaseText}</div>
          <p class="muted mb-0">${formatDate(meta.semStart)} – ${formatDate(meta.semEnd)} · ${info.label}${extra}</p>
        </div>
        <div class="sem-side"><span class="status-badge ${phaseClass}">${phaseText}</span>
          <button class="btn btn-light btn-sm" id="editSemesterButton">Edit dates</button></div>
      </div>
      <div class="progress thin-progress mt-3"><div class="progress-bar" style="width:${pct}%;background:var(--primary)"></div></div>`;
  }

  function openSemesterModal() {
    $("semNo").innerHTML = range(semesterCount()).map(i => `<option value="${i}">Semester ${i}</option>`).join("");
    $("semNo").value = meta.semNo || 1;
    $("semStart").value = meta.semStart || "";
    $("semEnd").value = meta.semEnd || "";
    $("midStart").value = meta.midStart || "";
    $("midEnd").value = meta.midEnd || "";
    $("semesterMessage").textContent = "";
    semesterModal.show();
  }

  $("semesterCard").addEventListener("click", e => { if (e.target.closest("#editSemesterButton")) openSemesterModal(); });

  $("semesterForm").addEventListener("submit", e => {
    e.preventDefault();
    const start = $("semStart").value, end = $("semEnd").value, ms = $("midStart").value, me = $("midEnd").value;
    const fail = (text) => { $("semesterMessage").textContent = text; };
    if (end <= start) return fail("End date must be after the start date.");
    if ((ms && !me) || (!ms && me) || (ms && me && (me < ms || ms < start || me > end))) return fail("Mid-sem break needs both dates, inside the semester.");
    meta = { ...meta, semNo: Number($("semNo").value), semStart: start, semEnd: end, midStart: ms, midEnd: me };
    semesterModal.hide();
    refreshAll();
  });

  // ---------- CALENDAR (deadlines + personal events) ----------
  const eventModal = new bootstrap.Modal($("eventModal"));
  const EVENT_CATEGORIES = ["Club", "Program", "Part-time", "Personal", "Other"];
  const evClass = (c) => "ev-" + c.toLowerCase().replace(/[^a-z]/g, "");
  $("evCategory").innerHTML = EVENT_CATEGORIES.map(c => `<option>${c}</option>`).join("");

  function openEventModal(ev = null, date = null) {
    $("eventForm").reset();
    $("editingEventId").value = ev ? ev.id : "";
    $("eventModalTitle").textContent = ev ? "Edit Event" : "Add Event";
    $("evTitle").value = ev ? ev.title : "";
    $("evCategory").value = ev ? ev.category : "Club";
    $("evDate").value = ev ? ev.date : (date || makeDate(0));
    $("evTime").value = ev ? ev.time : "";
    $("evNotes").value = ev ? ev.notes : "";
    $("deleteEventButton").classList.toggle("d-none", !ev);
    eventModal.show();
  }

  $("addEventButton").addEventListener("click", () => openEventModal());

  $("eventForm").addEventListener("submit", e => {
    e.preventDefault();
    const id = $("editingEventId").value;
    const ev = { id: id || "e" + Date.now(), title: $("evTitle").value.trim(), category: $("evCategory").value, date: $("evDate").value, time: $("evTime").value, notes: $("evNotes").value.trim() };
    if (!ev.title || !ev.date) return;
    events = id ? events.map(x => x.id === id ? ev : x) : [...events, ev];
    eventModal.hide();
    refreshAll();
  });

  $("deleteEventButton").addEventListener("click", () => {
    const id = $("editingEventId").value;
    if (id && confirm("Delete this event?")) { events = events.filter(x => x.id !== id); eventModal.hide(); refreshAll(); }
  });

  let calMonth = new Date();
  calMonth.setDate(1);

  function renderCalendar() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $("calTitle").textContent = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const cells = [];
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push('<div class="cal-cell empty"></div>');

    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
      const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
      const marks = [];
      if (meta.semStart && ds >= meta.semStart && ds <= meta.semEnd && dayDiff(meta.semStart, ds) % 7 === 0) marks.push("Week " + (dayDiff(meta.semStart, ds) / 7 + 1));
      if (ds === meta.semStart) marks.push("Semester starts");
      if (ds === meta.semEnd) marks.push("Semester ends");
      const onBreak = meta.midStart && meta.midEnd && ds >= meta.midStart && ds <= meta.midEnd;

      const taskChips = tasks.filter(t => t.date === ds).map(t =>
        `<button class="cal-event type-${t.type.toLowerCase()} ${t.status === "Done" ? "done" : ""}" data-kind="task" data-id="${escapeHTML(t.id)}" title="${escapeHTML(t.title)} (${escapeHTML(t.course)})">${escapeHTML(t.title)}</button>`);
      const eventChips = events.filter(x => x.date === ds).sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(x =>
        `<button class="cal-event ${evClass(x.category)}" data-kind="event" data-id="${escapeHTML(x.id)}" title="${escapeHTML(x.title)}">${x.time ? x.time + " " : ""}${escapeHTML(x.title)}</button>`);

      cells.push(`<div class="cal-cell ${ds === makeDate(0) ? "today" : ""} ${onBreak ? "break" : ""}" data-date="${ds}" title="Click to add an event">
        <span class="cal-day">${d}</span>${marks.map(t => `<span class="cal-mark">${t}</span>`).join("")}<div class="cal-events">${taskChips.concat(eventChips).join("")}</div></div>`);
    }
    $("calGrid").innerHTML = cells.join("");

    // "This Month" list: deadlines and personal events together
    const prefix = `${y}-${pad(m + 1)}`;
    const rows = [
      ...tasks.filter(t => t.date.startsWith(prefix)).map(t => ({ date: t.date, time: "", title: `${escapeHTML(t.title)} <small class="muted">(${escapeHTML(t.course)})</small>`, badges: `${priorityBadge(t)} ${typeBadge(t)}` })),
      ...events.filter(x => x.date.startsWith(prefix)).map(x => ({ date: x.date, time: x.time || "", title: `${escapeHTML(x.title)}${x.time ? ` <small class="muted">at ${x.time}</small>` : ""}${x.notes ? ` <small class="muted">· ${escapeHTML(x.notes)}</small>` : ""}`, badges: `<span class="status-badge ${evClass(x.category)}">${x.category}</span>` }))
    ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    $("calList").innerHTML = rows.length ? rows.map(r => `
      <div class="cal-list-row"><span class="cal-list-date">${formatDate(r.date)}</span><span class="cal-list-title">${r.title}</span>${r.badges}</div>`).join("")
      : '<p class="muted mb-0">Nothing scheduled this month. Click a day to add an event.</p>';
  }

  $("calGrid").addEventListener("click", e => {
    const chip = e.target.closest(".cal-event");
    if (chip) {
      if (chip.dataset.kind === "event") openEventModal(events.find(x => x.id === chip.dataset.id) || null);
      else { const t = tasks.find(x => x.id === chip.dataset.id); if (t) openTaskModal(t); }
      return;
    }
    const cell = e.target.closest(".cal-cell[data-date]");
    if (cell) openEventModal(null, cell.dataset.date);
  });
  $("calPrev").addEventListener("click", () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); });
  $("calNext").addEventListener("click", () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); });
  $("calToday").addEventListener("click", () => { calMonth = new Date(); calMonth.setDate(1); renderCalendar(); });

  // ---------- DASHBOARD ----------
  function updateDashboard() {
    const semNumbers = [...new Set(courses.filter(isGraded).map(c => c.semester))].sort((a, b) => a - b);
    const latest = semNumbers[semNumbers.length - 1];
    const pending = tasks.filter(t => t.status !== "Done");

    $("cgpaValue").textContent = fmt(gpa(courses));
    $("gpaValue").textContent = latest ? fmt(gpa(courses.filter(c => c.semester === latest))) : "–";
    $("gpaLabel").textContent = latest ? `Semester ${latest}` : "No graded semester yet";
    $("creditsValue").textContent = courses.filter(c => isGraded(c) && c.grade !== "F").reduce((s, c) => s + c.credit, 0);
    $("pendingValue").textContent = pending.length;

    // Study standby banner: exams coming within STUDY_DAYS days
    const soon = pending.filter(t => t.type === "Exam" && daysUntil(t.date) >= 0 && daysUntil(t.date) <= STUDY_DAYS)
      .sort((a, b) => a.date.localeCompare(b.date));
    $("examBanner").innerHTML = soon.map(t => `
      <div class="alert alert-warning study-banner"><i class="bi bi-alarm me-2"></i>
        <b>Study standby:</b> ${escapeHTML(t.title)} (${escapeHTML(t.course)}) is ${daysUntil(t.date) === 0 ? "today" : "in " + daysUntil(t.date) + " day(s)"}.
      </div>`).join("");

    const next = [...pending].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    $("upcomingBody").innerHTML = next.map(t => `
      <tr><td><div class="task-name-cell">${escapeHTML(t.title)}</div></td><td>${escapeHTML(t.course)}</td><td>${typeBadge(t)}</td><td>${formatDate(t.date)}${countdown(t)}</td></tr>`).join("");
    $("upcomingEmpty").classList.toggle("d-none", next.length > 0);

    drawCharts();
  }

  function makeChart(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }

  function drawCharts() {
    const text = getComputedStyle(document.body).color;
    const legend = { position: "bottom", labels: { color: text, usePointStyle: true, padding: 16 } };
    const base = { responsive: true, maintainAspectRatio: false, plugins: { legend } };
    const sems = range(semesterCount());

    // 1. GPA and cumulative CGPA per semester
    makeChart("gpaChart", {
      type: "line",
      data: {
        labels: sems.map(s => "Sem " + s),
        datasets: [
          { label: "GPA", data: sems.map(s => gpa(courses.filter(c => c.semester === s))), borderColor: "#1a5cff", backgroundColor: "#1a5cff", tension: 0.3, pointRadius: 5 },
          { label: "CGPA", data: sems.map(s => gpa(courses.filter(c => c.semester <= s))), borderColor: "#00a859", backgroundColor: "#00a859", borderDash: [6, 4], tension: 0.3, pointRadius: 4 }
        ]
      },
      options: { ...base, scales: { x: { ticks: { color: text }, grid: { display: false } }, y: { min: 0, max: 4, title: { display: true, text: "GPA (out of 4.00)", color: text }, ticks: { color: text, stepSize: 1 } } } }
    });

    // 2. Grade distribution (A / B / C / D / F)
    const groups = ["A", "B", "C", "D", "F"];
    makeChart("gradeChart", {
      type: "doughnut",
      data: {
        labels: groups.map(g => `Grade ${g} (${courses.filter(c => isGraded(c) && c.grade[0] === g).length})`),
        datasets: [{ data: groups.map(g => courses.filter(c => isGraded(c) && c.grade[0] === g).length), backgroundColor: ["#00a859", "#1a5cff", "#ff8800", "#e5121f", "#5f6368"], borderWidth: 0 }]
      },
      options: base
    });

    // 3. Tasks by status (done / pending / overdue)
    const today = makeDate(0);
    const isDone = (t) => t.status === "Done";
    const isLate = (t) => !isDone(t) && t.date < today;
    const nDone = tasks.filter(isDone).length, nLate = tasks.filter(isLate).length, nOpen = tasks.length - nDone - nLate;
    makeChart("statusChart", {
      type: "doughnut",
      data: { labels: [`Done (${nDone})`, `Pending (${nOpen})`, `Overdue (${nLate})`], datasets: [{ data: [nDone, nOpen, nLate], backgroundColor: ["#00a859", "#ff8800", "#e5121f"], borderWidth: 0 }] },
      options: base
    });

    // 4. Tasks by subject (stacked by status)
    const codes = [...new Set(tasks.map(t => t.course))].sort();
    const countFor = (test) => codes.map(c => tasks.filter(t => t.course === c && test(t)).length);
    makeChart("subjectChart", {
      type: "bar",
      data: {
        labels: codes,
        datasets: [
          { label: "Done", data: countFor(isDone), backgroundColor: "#00a859" },
          { label: "Pending", data: countFor(t => !isDone(t) && !isLate(t)), backgroundColor: "#ff8800" },
          { label: "Overdue", data: countFor(isLate), backgroundColor: "#e5121f" }
        ]
      },
      options: { ...base, scales: {
        x: { stacked: true, title: { display: true, text: "Subject (course code)", color: text }, ticks: { color: text }, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: "Number of items", color: text }, ticks: { precision: 0, color: text } }
      } }
    });
  }

  // ---------- NOTIFICATIONS ----------
  const notificationModal = new bootstrap.Modal($("notificationModal"));

  // Builds alerts from pending items: overdue, exam study standby, due within 3 days
  function updateNotifications() {
    const items = [];
    tasks.filter(t => t.status !== "Done").forEach(t => {
      const d = daysUntil(t.date);
      const label = `${escapeHTML(t.title)} (${escapeHTML(t.course)})`;
      if (d < 0) {
        items.push({ d, icon: "bi-exclamation-circle", color: "text-danger", title: "Overdue", text: `${label} was due ${-d} day(s) ago.` });
      } else if (t.type === "Exam" && d <= STUDY_DAYS) {
        items.push({ d, icon: "bi-alarm", color: "text-warning", title: "Study standby", text: `${label} is ${d === 0 ? "today" : "in " + d + " day(s)"}.` });
      } else if (d <= 3) {
        items.push({ d, icon: "bi-clock", color: "text-primary", title: "Due soon", text: `${label} is ${d === 0 ? "due today" : "due in " + d + " day(s)"}.` });
      }
    });
    if (meta.midStart) {
      const d = daysUntil(meta.midStart);
      if (d >= 0 && d <= 7) items.push({ d, icon: "bi-cup-hot", color: "text-success", title: "Mid-sem break", text: `Mid-sem break starts ${d === 0 ? "today" : "in " + d + " day(s)"}.` });
    }
    if (meta.semEnd) {
      const d = daysUntil(meta.semEnd);
      if (d >= 0 && d <= 14) items.push({ d, icon: "bi-flag", color: "text-primary", title: "Semester ending", text: `Semester ends ${d === 0 ? "today" : "in " + d + " day(s)"}.` });
    }
    events.forEach(x => {
      const d = daysUntil(x.date);
      if (d === 0 || d === 1) items.push({ d, icon: "bi-calendar-event", color: "text-info", title: x.category, text: `${escapeHTML(x.title)} ${d === 0 ? "today" : "tomorrow"}${x.time ? " at " + x.time : ""}.` });
    });
    items.sort((a, b) => a.d - b.d);

    $("notificationBadge").textContent = items.length;
    $("notificationBadge").classList.toggle("d-none", items.length === 0);
    $("notificationContent").innerHTML = items.length ? items.map(i => `
      <div class="d-flex gap-3 align-items-start py-3 border-bottom" style="border-color:var(--border)!important">
        <i class="bi ${i.icon} ${i.color} fs-5"></i>
        <div><b class="d-block">${i.title}</b><span class="muted">${i.text}</span></div>
      </div>`).join("")
      : '<div class="empty-state"><i class="bi bi-bell-slash"></i><h3>You\'re all caught up!</h3><p>No reminders right now.</p></div>';
  }

  $("notificationButton").addEventListener("click", () => notificationModal.show());

  // ---------- REFRESH ----------
  function refreshAll() {
    saveData();
    fillSemesterControls();
    renderCourses();
    renderTasks();
    renderSemesterCard();
    renderCalendar();
    updateDashboard();
    updateNotifications();
  }
});