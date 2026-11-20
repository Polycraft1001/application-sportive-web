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
  const reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

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

  const statCard = (icon, label, value) =>
    `<div class="card stat-card lift"><span class="stat-ico">${icon}</span><div>` +
    `<span class="card-label">${esc(label)}</span><span class="card-value">${esc(value)}</span></div></div>`;

  /* ---------- Effets : confettis, XP flottante, compteurs, anneaux ---------- */
  const Confetti = (function () {
    let parts = [];
    let raf = null;
    let canvas = null;
    let ctx = null;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function fire(count, x, y) {
      if (reducedMotion) return;
      count = count || 140;
      x = x === undefined ? 0.5 : x;
      y = y === undefined ? 0.4 : y;
      if (!canvas) {
        canvas = document.getElementById("confetti");
        ctx = canvas.getContext("2d");
      }
      if (!raf) resize();
      const colors = [cssVar("--primary"), cssVar("--primary-2"), "#ff3d77", "#ffd23f", "#2ee6a6", "#ffffff"];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 4 + Math.random() * 10;
        parts.push({
          x: x * innerWidth,
          y: y * innerHeight,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 6,
          size: 5 + Math.random() * 7,
          rot: Math.random() * 6.28,
          vr: (Math.random() - 0.5) * 0.35,
          color: colors[i % colors.length],
          life: 0,
          max: 110 + Math.random() * 70,
          round: Math.random() < 0.3
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(p => {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, 6.28);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      });
      parts = parts.filter(p => p.life < p.max && p.y < innerHeight + 50);
      if (parts.length) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    }

    return { fire };
  })();

  function xpFloat(amount, rect) {
    const el = document.createElement("div");
    el.className = "xp-float" + (amount < 0 ? " neg" : "");
    el.textContent = `${amount > 0 ? "+" : "−"}${Math.abs(amount)} XP`;
    el.style.left = (rect ? rect.left + rect.width / 2 : innerWidth / 2) + "px";
    el.style.top = (rect ? rect.top - 10 : innerHeight / 2) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  function countUp(el, to, digits = 0) {
    const from = parseFloat(el.dataset.v || "0");
    el.dataset.v = to;
    if (reducedMotion || from === to) {
      el.textContent = fmt(to, digits);
      return;
    }
    const t0 = performance.now();
    const dur = 800;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e, digits);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const RING_C = 2 * Math.PI * 52;
  function ring(key, value, goal, unit, over) {
    const ratio = goal ? value / goal : 0;
    const el = document.getElementById("ring" + key);
    el.style.strokeDashoffset = RING_C * (1 - Math.max(0, Math.min(1, ratio)));
    el.classList.toggle("over", !!over);
    countUp(document.getElementById("ring" + key + "Val"), Math.round(value));
    document.getElementById("ring" + key + "Pct").textContent = fmt(ratio * 100) + "%";
    document.getElementById("ring" + key + "Goal").textContent = t("goalOf", { n: fmt(goal), u: unit });
  }

  /* ---------- Célébrations (niveau / badges) ---------- */
  function celebrate(ev) {
    if (!ev || (!ev.levelUp && !ev.newBadges.length)) return;
    const badges = ev.newBadges;
    if (ev.levelUp) {
      const r = Game.rankFor(ev.levelUp);
      $("#celEyebrow").textContent = t("levelUp");
      $("#celIcon").innerHTML = `<span class="lvl-orb">${ev.levelUp}</span>`;
      $("#celTitle").textContent = t("levelUpText", { n: ev.levelUp });
      $("#celText").textContent = `${r.icon} ${t("rank_" + r.id)}`;
    } else {
      const b = badges[0];
      $("#celEyebrow").textContent = badges.length > 1 ? t("newBadges", { n: badges.length }) : t("newBadge");
      $("#celIcon").textContent = b.icon;
      $("#celTitle").textContent = t("b_" + b.id);
      $("#celText").textContent = t("bd_" + b.id) + (b.xp ? ` · +${b.xp} XP` : "");
    }
    const chips = ev.levelUp ? badges : badges.slice(1);
    $("#celBadges").innerHTML = chips.map(b =>
      `<span class="cel-chip">${b.icon} ${esc(t("b_" + b.id))}${b.xp ? ` <b>+${b.xp} XP</b>` : ""}</span>`
    ).join("");

    const box = $("#celebrate");
    box.hidden = false;
    void box.offsetWidth;
    box.classList.add("show");
    Confetti.fire(180, 0.5, 0.35);
    setTimeout(() => Confetti.fire(90, 0.15, 0.7), 250);
    setTimeout(() => Confetti.fire(90, 0.85, 0.7), 450);
    $("#celClose").focus();
  }

  function closeCelebrate() {
    const box = $("#celebrate");
    if (box.hidden) return;
    box.classList.remove("show");
    setTimeout(() => { box.hidden = true; }, 300);
  }

  /**
   * À appeler après chaque action : affiche l'XP gagnée ou perdue,
   * débloque les badges, détecte les niveaux et redessine l'appli.
   */
  function afterAction(before, anchor) {
    const rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    const diff = Math.round(Game.totalXp() - before);
    const ev = Game.sync();
    renderAll();
    if (diff) {
      xpFloat(diff, rect);
      const hud = $("#hudLevelBox");
      hud.classList.remove("pulse");
      void hud.offsetWidth;
      hud.classList.add("pulse");
    }
    celebrate(ev);
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
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = cssVar("--bg") || "#0a0a18";
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
    Game.setFlag("langChanged");
    applyTranslations();
    afterAction(Game.totalXp());
  }

  /* ---------- Navigation ---------- */
  function showTab(name) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    $$(".panel").forEach(p => p.classList.toggle("active", p.id === name));
    if (name === "stats") renderStats();
    if (name === "dashboard") renderDashboard();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  /* ---------- HUD (niveau, XP, série) ---------- */
  function renderHud() {
    const L = Game.levelInfo();
    $("#hudLevel").textContent = L.level;
    $("#hudTitle").textContent = `${L.rank.icon} ${t("rank_" + L.rank.id)}`;
    $("#hudXp").textContent = `${fmt(L.into)} / ${fmt(L.need)} XP`;
    $("#hudXpFill").style.width = (L.pct * 100).toFixed(1) + "%";
    const s = Game.currentStreak();
    $("#hudStreakN").textContent = s;
    $("#hudStreak").classList.toggle("cold", s === 0);
    $("#hudStreak").title = t("streakTip", { n: s });
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

  /* ---------- Accueil ---------- */
  function renderDashboard() {
    const p = S().profile;
    const today = todayISO();
    const tot = Store.dayTotals(today);
    const target = p.kcalTarget || 2000;
    const now = new Date();

    // Héros
    $("#heroDate").textContent = now.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
    $("#greeting").textContent = p.name ? t("helloName", { name: p.name }) : t("hello");
    const dayNum = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    $("#heroMotto").textContent = t("motto" + (dayNum % 5));
    const streak = Game.currentStreak();
    $("#heroStreak").textContent = streak;
    $("#heroStreakText").textContent = streak ? t("streakDays") : t("streakStart");
    $("#heroStreakBox").classList.toggle("cold", streak === 0);

    // Anneaux
    ring("Kcal", tot.kcal, target, "kcal", tot.kcal > target * 1.1);
    ring("Prot", tot.protein, Game.proteinGoal(), "g");
    ring("Move", Game.minutesOn(today), Game.DAILY_MOVE, "min");

    // Cartes
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
    const weekMin = lastNDays(7).reduce((s, d) => s + Game.minutesOn(d), 0);
    $("#dashWorkouts").textContent = `${fmt(weekMin)} min`;

    renderQuests();
    renderHeatmap();

    const items = mealItems(Store.mealsOn(today));
    $("#dashMeals").innerHTML = items.length ? items.join("") : `<li class="muted">${esc(t("noEntries"))}</li>`;
  }

  function renderQuests() {
    const qs = Game.quests();
    const claimed = qs.filter(q => q.claimed).length;
    $("#questCount").textContent = `${claimed}/${qs.length}`;
    $("#questList").innerHTML = qs.map(q => {
      const pct = q.max ? Math.min(100, (q.cur / q.max) * 100) : 0;
      const unit = q.unit ? " " + q.unit : "";
      let action;
      if (q.claimed) action = `<span class="quest-done" aria-label="OK">✔</span>`;
      else if (q.done) action = `<button class="btn btn-claim" type="button" data-claim="${q.id}">${esc(t("claim"))} +${Game.XP.quest}</button>`;
      else action = `<span class="quest-xp">+${Game.XP.quest} XP</span>`;
      const cls = ["quest", q.claimed ? "claimed" : q.done ? "ready" : "", q.over ? "over" : ""].join(" ");
      return `<li class="${cls}">
        <span class="quest-ico">${q.icon}</span>
        <div class="quest-body">
          <div class="quest-top"><span class="quest-title">${esc(t("q_" + q.id, { n: q.max }))}</span>
          <span class="quest-meta">${fmt(q.cur)}${unit} / ${fmt(q.max)}${unit}</span></div>
          <div class="quest-bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        </div>
        ${action}
      </li>`;
    }).join("");
    $("#questAllDone").hidden = claimed < qs.length;
  }

  function renderHeatmap() {
    const today = todayISO();
    $("#heatmap").innerHTML = Game.heatmap(12).map(c =>
      `<span class="hm l${c.lvl}${c.future ? " future" : ""}${c.date === today ? " today" : ""}" title="${esc(t("heatTip", { date: shortDate(c.date), n: c.n }))}"></span>`
    ).join("");
  }

  /* ---------- Trophées ---------- */
  function renderTrophies() {
    const L = Game.levelInfo();
    const st = Game.stats();
    const list = Game.badges();
    const unlocked = list.filter(b => b.unlocked).length;

    $("#trLevel").textContent = L.level;
    $("#trRank").textContent = `${L.rank.icon} ${t("rank_" + L.rank.id)}`;
    $("#trXpFill").style.width = (L.pct * 100).toFixed(1) + "%";
    $("#trXpText").textContent = t("nextLevel", { cur: fmt(L.into), need: fmt(L.need), n: L.level + 1 });

    $("#trStats").innerHTML = [
      ["✨", t("totalXp"), fmt(L.xp)],
      ["🔥", t("bestStreak"), `${st.bestStreak} ${t("daysShort")}`],
      ["🎖️", t("perfectDays"), fmt(st.perfectDays)],
      ["🏅", t("badgesUnlocked"), `${unlocked} / ${list.length}`]
    ].map(([i, l, v]) => statCard(i, l, v)).join("");

    $("#badgeGrid").innerHTML = list.map(b => {
      const pct = Math.round((b.cur / b.goal) * 100);
      const xpTxt = b.xp ? `+${b.xp} XP` : "";
      const footer = b.unlocked
        ? `<span class="badge-xp">${xpTxt ? xpTxt + " · " : ""}${esc(t("unlockedOn", { date: shortDate(b.date) }))}</span>`
        : `<div class="mini-bar"><div style="width:${pct}%"></div></div><span class="badge-xp muted">${fmt(b.cur)} / ${fmt(b.goal)}${xpTxt ? " · " + xpTxt : ""}</span>`;
      return `<div class="card badge-card lift${b.unlocked ? "" : " locked"}">
        ${b.unlocked ? "" : '<span class="lock" aria-hidden="true">🔒</span>'}
        <div class="badge-icon">${b.icon}</div>
        <span class="badge-name">${esc(t("b_" + b.id))}</span>
        <span class="badge-desc">${esc(t("bd_" + b.id))}</span>
        ${footer}
      </div>`;
    }).join("");

    $("#rankList").innerHTML = Game.RANKS.map(r => {
      const cls = r.id === L.rank.id ? "current" : L.level < r.from ? "locked" : "";
      return `<div class="rank ${cls}">${r.icon} ${esc(t("rank_" + r.id))} <small>${esc(t("rankFrom", { n: r.from }))}</small></div>`;
    }).join("");

    const X = Game.XP;
    $("#xpRules").innerHTML = [
      ["🍽️", t("xpRule_meal", { n: X.meal })],
      ["⚖️", t("xpRule_weight", { n: X.weight })],
      ["🏃", t("xpRule_workout", { n: X.workout })],
      ["🎯", t("xpRule_quest", { n: X.quest })],
      ["🏅", t("xpRule_badge")],
      ["↩️", t("xpRule_note")]
    ].map(([i, s]) => `<li><span>${i}</span>${esc(s)}</li>`).join("");
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
      <p class="eyebrow">${esc(t("yourBmi"))}</p>
      <p class="big-value grad-text">${fmt(r.bmi, 1)}</p>
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
      <button class="btn btn-block" type="button" id="bmiSave">${esc(t("saveToProfile"))}</button>
      <p class="muted small">${esc(t("bmiDisclaimer"))}</p>`;
    $("#bmiSave").addEventListener("click", e => {
      const before = Game.totalXp();
      Object.assign(S().profile, {
        heightCm: r.h, age: r.age, sex: r.sex, activity: r.activity, goal: r.goal, kcalTarget: r.target
      });
      Store.addWeight(todayISO(), r.w);
      Game.setFlag("bmiSaved");
      prefillSettings();
      toast(t("savedProfile"));
      afterAction(before, e.currentTarget);
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
        <td class="num"><button class="btn btn-small" type="button" data-add-food="${esc(f.id)}">+ ${esc(t("add"))}</button></td>
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
    const before = Game.totalXp();
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
    afterAction(before, null);
  }

  /* ---------- Journal (saisie manuelle) ---------- */
  const journalDate = () => $("#journalDate").value || todayISO();
  const submitBtn = form => form.querySelector('button[type="submit"]');

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
    const before = Game.totalXp();
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
    afterAction(before, submitBtn(e.target));
  }

  function onWeightSubmit(e) {
    e.preventDefault();
    const kg = +$("#weightKg").value;
    if (!kg) return;
    const before = Game.totalXp();
    Store.addWeight(journalDate(), kg);
    e.target.reset();
    toast(t("weightAdded"));
    prefillBmi();
    afterAction(before, submitBtn(e.target));
  }

  function onWorkoutSubmit(e) {
    e.preventDefault();
    const type = $("#workoutType").value;
    const minutes = +$("#workoutMinutes").value;
    if (!minutes) return;
    const before = Game.totalXp();
    let kcal = $("#workoutKcal").value;
    if (kcal === "") {
      const w = Store.latestWeight();
      kcal = Math.round((WORKOUT_MET[type] || 5) * (w ? w.kg : 70) * (minutes / 60));
    }
    Store.addWorkout({ date: journalDate(), type, minutes, kcal });
    e.target.reset();
    $("#workoutType").value = type;
    toast(t("workoutAdded"));
    afterAction(before, submitBtn(e.target));
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
    const text = cssVar("--muted");
    const grid = cssVar("--track");
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text, font: { family: "Outfit", weight: "600" } } } }
    };
    if (config.type !== "doughnut") {
      options.scales = {
        x: { ticks: { color: text, maxRotation: 0, autoSkip: true }, grid: { color: grid } },
        y: { ticks: { color: text }, grid: { color: grid }, beginAtZero }
      };
    } else {
      options.cutout = "68%";
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
    const minutes = days.map(d => Game.minutesOn(d));
    const macro = totals.reduce((a, x) => ({ p: a.p + x.protein, c: a.c + x.carbs, f: a.f + x.fat }), { p: 0, c: 0, f: 0 });

    const logged = kcal.filter(k => k > 0).length;
    const avg = logged ? kcal.reduce((a, b) => a + b, 0) / logged : 0;
    const wVals = weights.filter(v => v !== null);
    const change = wVals.length >= 2 ? wVals[wVals.length - 1] - wVals[0] : null;
    const totalMin = minutes.reduce((a, b) => a + b, 0);

    $("#statsSummary").innerHTML = [
      ["🔥", t("avgKcal"), `${fmt(avg)} kcal`],
      ["⏱️", t("totalWorkout"), `${fmt(totalMin)} min`],
      ["⚖️", t("weightChange"), change === null ? "–" : `${change > 0 ? "+" : ""}${fmt(change, 1)} kg`],
      ["📅", t("daysLogged"), `${logged} / ${n}`]
    ].map(([i, l, v]) => statCard(i, l, v)).join("");

    const primary = cssVar("--primary");
    const primary2 = cssVar("--primary-2");
    drawChart("chartWeight", {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "kg", data: weights, borderColor: primary, backgroundColor: primary + "33",
          pointBackgroundColor: primary2, pointRadius: 4, borderWidth: 3, fill: true, spanGaps: true, tension: 0.35
        }]
      }
    }, false);
    drawChart("chartKcal", {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: t("consumed"), data: kcal, backgroundColor: primary, borderRadius: 8 },
          { type: "line", label: t("target"), data: days.map(() => target), borderColor: cssVar("--danger"), borderDash: [6, 4], pointRadius: 0, fill: false }
        ]
      }
    });
    drawChart("chartMacros", {
      type: "doughnut",
      data: {
        labels: [t("protein"), t("carbs"), t("fat")],
        datasets: [{
          data: [macro.p * 4, macro.c * 4, macro.f * 9].map(v => Math.round(v)),
          backgroundColor: [primary, primary2, cssVar("--warn")], borderWidth: 0, hoverOffset: 10
        }]
      }
    });
    drawChart("chartWorkouts", {
      type: "bar",
      data: { labels, datasets: [{ label: t("minutes"), data: minutes, backgroundColor: primary2, borderRadius: 8 }] }
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
    const prevTheme = S().settings.theme;
    Object.assign(S().settings, {
      theme: $("#setTheme").value,
      shape: $("#setShape").value,
      font: $("#setFont").value
    });
    Store.save();
    if (S().settings.theme !== prevTheme) Game.setFlag("themeChanged");
    applyAppearance();
    afterAction(Game.totalXp()); // recolore aussi les graphiques
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
    renderHud();
    renderDashboard();
    renderBmiResult();
    renderFoods();
    renderJournal();
    renderTrophies();
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

    // Quêtes : récupérer la récompense
    $("#questList").addEventListener("click", e => {
      const b = e.target.closest("[data-claim]");
      if (!b) return;
      const before = Game.totalXp();
      const r = b.getBoundingClientRect();
      if (Game.claimQuest(b.dataset.claim)) {
        Confetti.fire(70, (r.left + r.width / 2) / innerWidth, r.top / innerHeight);
        toast(t("questClaimed", { xp: Game.XP.quest }));
        afterAction(before, b);
      }
    });

    // Suppression d'une entrée (accueil + journal)
    document.addEventListener("click", e => {
      const b = e.target.closest(".icon-btn[data-col]");
      if (!b) return;
      const before = Game.totalXp();
      Store.remove(b.dataset.col, b.dataset.id);
      toast(t("deleted"));
      afterAction(before, b);
    });

    // Fenêtre de célébration
    $("#celClose").addEventListener("click", closeCelebrate);
    $("#celebrate").addEventListener("click", e => { if (e.target.id === "celebrate") closeCelebrate(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeCelebrate(); });

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
    const ev = Game.sync();
    renderAll();
    setTimeout(() => celebrate(ev), 500);
  }

  init();
})();
