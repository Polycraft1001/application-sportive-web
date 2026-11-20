/* =========================================================
   Application sportive — logique principale
   ========================================================= */
(function () {
  "use strict";

  Store.load();
  const S = () => Store.data;
  let lang = S().settings.lang === "en" ? "en" : "fr";
  let lastBmi = null;
  let pendingFood = null;
  const charts = {};

  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"];
  // Valeurs MET approximatives pour estimer les calories brûlées
  const WORKOUT_MET = { running: 9.8, cycling: 7.5, swimming: 8, strength: 5, football: 7, walking: 3.5, other: 5 };

  /* ---------- Utilitaires ---------- */
  function t(key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  const locale = () => (lang === "fr" ? "fr-FR" : "en-GB");
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString(locale(), { maximumFractionDigits: d });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalize = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const foodName = f => f[lang] || f.fr;
  function shortDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit" });
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- Calculs santé ---------- */
  function calcBmi(kg, cm) {
    const m = cm / 100;
    return kg / (m * m);
  }
  function bmiCategory(b) {
    if (b < 18.5) return { key: "bmiUnder", cls: "warn" };
    if (b < 25) return { key: "bmiNormal", cls: "ok" };
    if (b < 30) return { key: "bmiOver", cls: "warn" };
    return { key: "bmiObese", cls: "danger" };
  }
  // Formule de Mifflin-St Jeor
  function calcBmr(kg, cm, age, sex) {
    return 10 * kg + 6.25 * cm - 5 * age + (sex === "f" ? -161 : 5);
  }
  function calcTarget(tdee, goal, sex) {
    const min = sex === "f" ? 1200 : 1500;
    if (goal === "lose") return Math.max(min, Math.round(tdee - 400));
    if (goal === "gain") return Math.round(tdee + 300);
    return Math.round(tdee);
  }

  /* ---------- Apparence & langue ---------- */
  function applyAppearance() {
    const s = S().settings;
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    root.dataset.shape = s.shape;
    root.dataset.font = s.font;
  }

  function fillSelect(el, items) {
    const prev = el.value;
    el.innerHTML = items.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join("");
    if (prev && items.some(([v]) => v === prev)) el.value = prev;
  }

  function fillDynamicSelects() {
    $$(".meal-select").forEach(el => fillSelect(el, MEAL_TYPES.map(m => [m, t(m)])));
    fillSelect($("#workoutType"), Object.keys(WORKOUT_MET).map(w => [w, t(w)]));
    fillSelect(
      $("#foodCategory"),
      [["all", t("allCategories")]].concat(Object.keys(FOOD_CATEGORIES).map(c => [c, FOOD_CATEGORIES[c][lang]]))
    );
  }

  function applyTranslations() {
    document.documentElement.lang = lang;
    document.title = t("appTitle");
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $("#langToggle").textContent = lang === "fr" ? "EN" : "FR";
    $("#setLang").value = lang;
    fillDynamicSelects();
  }

  function setLang(l) {
    lang = l === "en" ? "en" : "fr";
    S().settings.lang = lang;
    Store.save();
    applyTranslations();
    renderAll();
  }

  /* ---------- Navigation ---------- */
  function showTab(name) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    $$(".panel").forEach(p => p.classList.toggle("active", p.id === name));
    if (name === "stats") renderStats();
  }

  /* ---------- Rendu : éléments de liste ---------- */
  function entryHtml(col, id, title, meta) {
    return `<li class="entry"><div><span class="entry-title">${esc(title)}</span><span class="entry-meta">${esc(meta)}</span></div>` +
      `<button class="icon-btn" type="button" data-col="${col}" data-id="${esc(id)}" title="${esc(t("delete"))}" aria-label="${esc(t("delete"))}">✕</button></li>`;
  }
  function mealItems(meals) {
    const out = [];
    MEAL_TYPES.forEach(mt => {
      meals.filter(m => m.mealType === mt).forEach(m => {
        const grams = m.grams ? ` (${fmt(m.grams)} g)` : "";
        out.push(entryHtml("meals", m.id, `🍽️ ${t(mt)} — ${m.name}${grams}`,
          `${fmt(m.kcal)} kcal · ${t("protein")} ${fmt(m.protein, 1)} g`));
      });
    });
    return out;
  }

  /* ---------- Tableau de bord ---------- */
  function renderDashboard() {
    const p = S().profile;
    const today = todayISO();
    const tot = Store.dayTotals(today);
    const target = p.kcalTarget || 2000;

    $("#greeting").textContent = p.name ? t("helloName", { name: p.name }) : t("hello");
    $("#dashKcal").textContent = `${fmt(tot.kcal)} / ${fmt(target)} kcal`;
    const bar = $("#dashKcalBar");
    bar.style.width = Math.min(100, (tot.kcal / target) * 100) + "%";
    bar.classList.toggle("over", tot.kcal > target);
    $("#dashProtein").textContent = `${fmt(tot.protein, 1)} g`;

    const w = Store.latestWeight();
    if (w && p.heightCm) {
      const b = calcBmi(w.kg, p.heightCm);
      $("#dashBmi").textContent = fmt(b, 1);
      $("#dashBmiCat").textContent = t(bmiCategory(b).key);
    } else {
      $("#dashBmi").textContent = "–";
      $("#dashBmiCat").textContent = "";
    }
    $("#dashWeight").textContent = w ? `${fmt(w.kg, 1)} kg` : "–";

    const weekMin = lastNDays(7).reduce((s, d) => s + Store.workoutsOn(d).reduce((a, x) => a + x.minutes, 0), 0);
    $("#dashWorkouts").textContent = `${fmt(weekMin)} min`;

    const items = mealItems(Store.mealsOn(today));
    $("#dashMeals").innerHTML = items.length ? items.join("") : `<li class="muted">${esc(t("noEntries"))}</li>`;
  }

  /* ---------- IMC ---------- */
  function prefillBmi() {
    const p = S().profile;
    const w = Store.latestWeight();
    if (p.heightCm) $("#bmiHeight").value = p.heightCm;
    if (w) $("#bmiWeight").value = w.kg;
    if (p.age) $("#bmiAge").value = p.age;
    $("#bmiSex").value = p.sex;
    $("#bmiActivity").value = String(p.activity);
    $("#bmiGoal").value = p.goal;
  }

  function onBmiSubmit(e) {
    e.preventDefault();
    const h = +$("#bmiHeight").value;
    const w = +$("#bmiWeight").value;
    const age = +$("#bmiAge").value;
    const sex = $("#bmiSex").value;
    const activity = +$("#bmiActivity").value;
    const goal = $("#bmiGoal").value;
    if (!h || !w || !age) return;
    const bmr = calcBmr(w, h, age, sex);
    const tdee = bmr * activity;
    lastBmi = { h, w, age, sex, activity, goal, bmi: calcBmi(w, h), bmr, tdee, target: calcTarget(tdee, goal, sex) };
    renderBmiResult();
  }

  function renderBmiResult() {
    const box = $("#bmiResult");
    if (!lastBmi) {
      box.innerHTML = `<p class="muted">${esc(t("bmiHint"))}</p>`;
      return;
    }
    const r = lastBmi;
    const cat = bmiCategory(r.bmi);
    const pos = Math.min(100, Math.max(0, ((r.bmi - 15) / 25) * 100));
    const m2 = Math.pow(r.h / 100, 2);
    box.innerHTML = `
      <p class="muted">${esc(t("yourBmi"))}</p>
      <p class="big-value">${fmt(r.bmi, 1)}</p>
      <span class="badge ${cat.cls}">${esc(t(cat.key))}</span>
      <div class="gauge"><div class="gauge-marker" style="left:${pos}%"></div></div>
      <div class="gauge-labels">
        <span style="left:0%">15</span><span style="left:14%">${fmt(18.5, 1)}</span>
        <span style="left:40%">25</span><span style="left:60%">30</span><span style="left:100%">40</span>
      </div>
      <ul class="result-list">
        <li>${esc(t("healthyRange"))} : <strong>${fmt(18.5 * m2, 1)} – ${fmt(24.9 * m2, 1)} kg</strong></li>
        <li>${esc(t("bmr"))} : <strong>${fmt(r.bmr)} kcal</strong></li>
        <li>${esc(t("tdee"))} : <strong>${fmt(r.tdee)} kcal</strong></li>
        <li>${esc(t("kcalTargetLabel"))} : <strong>${fmt(r.target)} kcal</strong></li>
      </ul>
      <button class="btn" type="button" id="bmiSave">${esc(t("saveToProfile"))}</button>
      <p class="muted small">${esc(t("bmiDisclaimer"))}</p>`;
    $("#bmiSave").addEventListener("click", () => {
      Object.assign(S().profile, {
        heightCm: r.h, age: r.age, sex: r.sex, activity: r.activity, goal: r.goal, kcalTarget: r.target
      });
      Store.addWeight(todayISO(), r.w);
      prefillSettings();
      toast(t("savedProfile"));
      renderAll();
    });
  }

  /* ---------- Aliments : recherche & filtres ---------- */
  function renderFoods() {
    const q = normalize($("#foodSearch").value.trim());
    const cat = $("#foodCategory").value || "all";
    const sort = $("#foodSort").value;
    const maxRaw = $("#foodMaxKcal").value;
    const maxK = maxRaw === "" ? Infinity : +maxRaw;
    const highP = $("#foodHighProtein").checked;

    const list = FOODS.filter(f =>
      (!q || normalize(f.fr).includes(q) || normalize(f.en).includes(q)) &&
      (cat === "all" || f.cat === cat) &&
      f.kcal <= maxK &&
      (!highP || f.protein >= 15)
    );
    if (sort === "kcal") list.sort((a, b) => a.kcal - b.kcal);
    else if (sort === "protein") list.sort((a, b) => b.protein - a.protein);
    else list.sort((a, b) => foodName(a).localeCompare(foodName(b), locale()));

    $("#foodCount").textContent = t("foodCount", { n: list.length });
    $("#foodTable").innerHTML = list.map(f => `
      <tr>
        <td><strong>${esc(foodName(f))}</strong></td>
        <td><span class="tag">${esc(FOOD_CATEGORIES[f.cat][lang])}</span></td>
        <td class="num">${fmt(f.kcal)}</td>
        <td class="num">${fmt(f.protein, 1)} g</td>
        <td class="num">${fmt(f.carbs, 1)} g</td>
        <td class="num">${fmt(f.fat, 1)} g</td>
        <td class="num"><button class="btn btn-secondary" type="button" data-add-food="${esc(f.id)}">+ ${esc(t("add"))}</button></td>
      </tr>`).join("");
  }

  function guessMealType() {
    const h = new Date().getHours();
    if (h < 10) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 18) return "snack";
    return "dinner";
  }

  function scaled(f, grams) {
    const k = grams / 100;
    return { kcal: f.kcal * k, protein: f.protein * k, carbs: f.carbs * k, fat: f.fat * k };
  }

  function updateFoodPreview() {
    if (!pendingFood) return;
    const g = +$("#addFoodGrams").value || 0;
    const v = scaled(pendingFood, g);
    $("#addFoodPreview").textContent =
      `${fmt(v.kcal)} kcal · ${t("protein")} ${fmt(v.protein, 1)} g · ${t("carbs")} ${fmt(v.carbs, 1)} g · ${t("fat")} ${fmt(v.fat, 1)} g`;
  }

  function openAddFood(id) {
    pendingFood = FOODS.find(f => f.id === id) || null;
    if (!pendingFood) return;
    $("#addFoodTitle").textContent = foodName(pendingFood);
    $("#addFoodGrams").value = 100;
    $("#addFoodDate").value = todayISO();
    $("#addFoodMeal").value = guessMealType();
    updateFoodPreview();
    $("#addFoodDialog").showModal();
  }

  function onAddFoodSubmit(e) {
    e.preventDefault();
    if (!pendingFood) return;
    const grams = +$("#addFoodGrams").value;
    if (!grams) return;
    const v = scaled(pendingFood, grams);
    Store.addMeal({
      date: $("#addFoodDate").value || todayISO(),
      mealType: $("#addFoodMeal").value,
      name: foodName(pendingFood),
      grams,
      foodId: pendingFood.id,
      ...v
    });
    $("#addFoodDialog").close();
    pendingFood = null;
    toast(t("mealAdded"));
    renderAll();
  }

  /* ---------- Journal (saisie manuelle) ---------- */
  const journalDate = () => $("#journalDate").value || todayISO();

  function renderJournal() {
    const date = journalDate();
    const items = mealItems(Store.mealsOn(date));
    Store.workoutsOn(date).forEach(w => {
      items.push(entryHtml("workouts", w.id, `🏃 ${t(w.type)} — ${fmt(w.minutes)} min`, `−${fmt(w.kcal)} kcal`));
    });
    const wt = Store.weightOn(date);
    if (wt) items.push(entryHtml("weights", wt.id, `⚖️ ${t("weightShort")}`, `${fmt(wt.kg, 1)} kg`));

    $("#journalList").innerHTML = items.length ? items.join("") : `<li class="muted">${esc(t("noEntries"))}</li>`;
    const tot = Store.dayTotals(date);
    $("#journalTotals").textContent = t("dayTotal", {
      kcal: fmt(tot.kcal), p: fmt(tot.protein), c: fmt(tot.carbs), f: fmt(tot.fat)
    });
  }

  function onMealSubmit(e) {
    e.preventDefault();
    Store.addMeal({
      date: journalDate(),
      mealType: $("#mealType").value,
      name: $("#mealName").value,
      grams: $("#mealGrams").value,
      kcal: $("#mealKcal").value,
      protein: $("#mealProtein").value,
      carbs: $("#mealCarbs").value,
      fat: $("#mealFat").value
    });
    const keepType = $("#mealType").value;
    e.target.reset();
    $("#mealType").value = keepType;
    toast(t("mealAdded"));
    renderAll();
  }

  function onWeightSubmit(e) {
    e.preventDefault();
    const kg = +$("#weightKg").value;
    if (!kg) return;
    Store.addWeight(journalDate(), kg);
    e.target.reset();
    toast(t("weightAdded"));
    prefillBmi();
    renderAll();
  }

  function onWorkoutSubmit(e) {
    e.preventDefault();
    const type = $("#workoutType").value;
    const minutes = +$("#workoutMinutes").value;
    if (!minutes) return;
    let kcal = $("#workoutKcal").value;
    if (kcal === "") {
      const w = Store.latestWeight();
      kcal = Math.round((WORKOUT_MET[type] || 5) * (w ? w.kg : 70) * (minutes / 60));
    }
    Store.addWorkout({ date: journalDate(), type, minutes, kcal });
    e.target.reset();
    $("#workoutType").value = type;
    toast(t("workoutAdded"));
    renderAll();
  }

  /* ---------- Statistiques ---------- */
  function drawChart(id, config, beginAtZero = true) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
    if (typeof Chart === "undefined") {
      $("#statsNotice").hidden = false;
      return;
    }
    const text = cssVar("--text");
    const grid = cssVar("--border");
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text } } }
    };
    if (config.type !== "doughnut") {
      options.scales = {
        x: { ticks: { color: text, maxRotation: 0, autoSkip: true }, grid: { color: grid } },
        y: { ticks: { color: text }, grid: { color: grid }, beginAtZero }
      };
    }
    config.options = options;
    charts[id] = new Chart(document.getElementById(id), config);
  }

  function renderStats() {
    if (!$("#stats").classList.contains("active")) return;
    const n = +$("#statsPeriod").value || 7;
    const days = lastNDays(n);
    const labels = days.map(shortDate);
    const totals = days.map(d => Store.dayTotals(d));
    const kcal = totals.map(x => Math.round(x.kcal));
    const target = S().profile.kcalTarget || 2000;
    const wMap = {};
    S().weights.forEach(w => { wMap[w.date] = w.kg; });
    const weights = days.map(d => (d in wMap ? wMap[d] : null));
    const minutes = days.map(d => Store.workoutsOn(d).reduce((s, w) => s + w.minutes, 0));
    const macro = totals.reduce((a, x) => ({ p: a.p + x.protein, c: a.c + x.carbs, f: a.f + x.fat }), { p: 0, c: 0, f: 0 });

    const logged = kcal.filter(k => k > 0).length;
    const avg = logged ? kcal.reduce((a, b) => a + b, 0) / logged : 0;
    const wVals = weights.filter(v => v !== null);
    const change = wVals.length >= 2 ? wVals[wVals.length - 1] - wVals[0] : null;
    const totalMin = minutes.reduce((a, b) => a + b, 0);

    $("#statsSummary").innerHTML = [
      [t("avgKcal"), `${fmt(avg)} kcal`],
      [t("totalWorkout"), `${fmt(totalMin)} min`],
      [t("weightChange"), change === null ? "–" : `${change > 0 ? "+" : ""}${fmt(change, 1)} kg`],
      [t("daysLogged"), `${logged} / ${n}`]
    ].map(([l, v]) => `<div class="card"><span class="card-label">${esc(l)}</span><span class="card-value">${esc(v)}</span></div>`).join("");

    const primary = cssVar("--primary");
    drawChart("chartWeight", {
      type: "line",
      data: { labels, datasets: [{ label: "kg", data: weights, borderColor: primary, backgroundColor: primary, spanGaps: true, tension: 0.3 }] }
    }, false);
    drawChart("chartKcal", {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: t("consumed"), data: kcal, backgroundColor: primary },
          { type: "line", label: t("target"), data: days.map(() => target), borderColor: cssVar("--danger"), borderDash: [6, 4], pointRadius: 0, fill: false }
        ]
      }
    });
    drawChart("chartMacros", {
      type: "doughnut",
      data: {
        labels: [t("protein"), t("carbs"), t("fat")],
        datasets: [{ data: [macro.p * 4, macro.c * 4, macro.f * 9].map(v => Math.round(v)), backgroundColor: [primary, cssVar("--warn"), cssVar("--danger")] }]
      }
    });
    drawChart("chartWorkouts", {
      type: "bar",
      data: { labels, datasets: [{ label: t("minutes"), data: minutes, backgroundColor: cssVar("--ok") }] }
    });
  }

  /* ---------- Paramètres ---------- */
  function prefillSettings() {
    const s = S().settings;
    const p = S().profile;
    $("#setTheme").value = s.theme;
    $("#setShape").value = s.shape;
    $("#setFont").value = s.font;
    $("#setLang").value = lang;
    $("#setName").value = p.name || "";
    $("#setKcalTarget").value = p.kcalTarget || 2000;
  }

  function onAppearanceChange() {
    Object.assign(S().settings, {
      theme: $("#setTheme").value,
      shape: $("#setShape").value,
      font: $("#setFont").value
    });
    Store.save();
    applyAppearance();
    renderStats(); // recolore les graphiques
  }

  function exportData() {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `application-sportive-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        toast(t("importOk"));
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        toast(t("importError"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* ---------- Rendu global & évènements ---------- */
  function renderAll() {
    renderDashboard();
    renderBmiResult();
    renderFoods();
    renderJournal();
    renderStats();
  }

  function bindEvents() {
    $$(".tab").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
    $("#langToggle").addEventListener("click", () => setLang(lang === "fr" ? "en" : "fr"));

    $("#bmiForm").addEventListener("submit", onBmiSubmit);

    ["#foodSearch", "#foodMaxKcal"].forEach(s => $(s).addEventListener("input", renderFoods));
    ["#foodCategory", "#foodSort", "#foodHighProtein"].forEach(s => $(s).addEventListener("change", renderFoods));
    $("#foodTable").addEventListener("click", e => {
      const b = e.target.closest("[data-add-food]");
      if (b) openAddFood(b.dataset.addFood);
    });
    $("#addFoodGrams").addEventListener("input", updateFoodPreview);
    $("#addFoodForm").addEventListener("submit", onAddFoodSubmit);
    $("#addFoodCancel").addEventListener("click", () => $("#addFoodDialog").close());

    $("#journalDate").addEventListener("change", renderJournal);
    $("#mealForm").addEventListener("submit", onMealSubmit);
    $("#weightForm").addEventListener("submit", onWeightSubmit);
    $("#workoutForm").addEventListener("submit", onWorkoutSubmit);

    // Suppression d'une entrée (tableau de bord + journal)
    document.addEventListener("click", e => {
      const b = e.target.closest(".icon-btn[data-col]");
      if (!b) return;
      Store.remove(b.dataset.col, b.dataset.id);
      toast(t("deleted"));
      renderAll();
    });

    $("#statsPeriod").addEventListener("change", renderStats);

    ["#setTheme", "#setShape", "#setFont"].forEach(s => $(s).addEventListener("change", onAppearanceChange));
    $("#setLang").addEventListener("change", e => setLang(e.target.value));
    $("#saveProfile").addEventListener("click", () => {
      S().profile.name = $("#setName").value.trim().slice(0, 40);
      const k = +$("#setKcalTarget").value;
      if (k >= 800 && k <= 6000) S().profile.kcalTarget = Math.round(k);
      Store.save();
      prefillSettings();
      toast(t("saved"));
      renderAll();
    });
    $("#exportData").addEventListener("click", exportData);
    $("#importData").addEventListener("change", importData);
    $("#resetData").addEventListener("click", () => {
      if (confirm(t("confirmReset"))) {
        Store.reset();
        location.reload();
      }
    });
  }

  function init() {
    applyAppearance();
    applyTranslations();
    $("#journalDate").value = todayISO();
    prefillBmi();
    prefillSettings();
    bindEvents();
    renderAll();
  }

  init();
})();
