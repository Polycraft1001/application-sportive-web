/* =========================================================
   Gamification : XP, niveaux, rangs, séries, quêtes du jour, badges

   L'XP d'activité est recalculée à partir du journal (Store) :
   supprimer une entrée retire donc l'XP qu'elle avait rapportée.
   Les quêtes récupérées et les badges débloqués sont enregistrés
   dans Store.data.game.

   Le champ « icon » contient le nom d'une icône Lucide
   (voir js/icons.js et https://lucide.dev/icons).
   ========================================================= */
const Game = (function () {
  "use strict";

  const XP = {
    meal: 10, mealsPerDay: 6,
    weight: 15,
    workout: 20, workoutPerMin: 0.5, workoutMaxMin: 120, workoutsPerDay: 3,
    quest: 30
  };
  const MOVE_GOAL = 20;  // minutes pour la quête « Bouger »
  const DAILY_MOVE = 30; // objectif de l'anneau « Sport aujourd'hui »

  const RANKS = [
    { from: 1, id: "rookie", icon: "sprout" },
    { from: 3, id: "warmup", icon: "flame" },
    { from: 5, id: "athlete", icon: "zap" },
    { from: 8, id: "machine", icon: "cpu" },
    { from: 12, id: "champion", icon: "trophy" },
    { from: 16, id: "titan", icon: "shield" },
    { from: 20, id: "legend", icon: "crown" }
  ];

  const g = () => Store.data.game;
  // XP cumulée nécessaire pour atteindre le niveau L (1 → 0, 2 → 100, 3 → 300, 4 → 600…)
  const xpFor = L => 50 * L * (L - 1);

  function dayDiff(a, b) {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }
  function daysAgo(i) {
    const n = new Date();
    return toISO(new Date(n.getFullYear(), n.getMonth(), n.getDate() - i, 12));
  }

  /* ----- Séries ----- */
  function activeDays() {
    const d = Store.data;
    const set = new Set();
    d.meals.forEach(m => set.add(m.date));
    d.workouts.forEach(w => set.add(w.date));
    d.weights.forEach(w => set.add(w.date));
    return set;
  }

  /** Jours d'affilée avec au moins une entrée (aujourd'hui pas encore rempli = la série continue). */
  function currentStreak() {
    const days = activeDays();
    let i = days.has(todayISO()) ? 0 : 1;
    let s = 0;
    while (days.has(daysAgo(i))) { s++; i++; }
    return s;
  }

  function bestStreak() {
    const today = todayISO();
    const list = [...activeDays()].filter(d => d <= today).sort();
    let best = 0, cur = 0, prev = null;
    list.forEach(d => {
      cur = prev && dayDiff(prev, d) === 1 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    });
    return best;
  }

  /* ----- XP & niveaux ----- */
  function activityXp() {
    const d = Store.data;
    let xp = 0;
    const meals = {};
    const wk = {};
    d.meals.forEach(m => { meals[m.date] = (meals[m.date] || 0) + 1; });
    Object.keys(meals).forEach(k => { xp += Math.min(meals[k], XP.mealsPerDay) * XP.meal; });
    xp += d.weights.length * XP.weight;
    d.workouts.forEach(w => {
      wk[w.date] = (wk[w.date] || 0) + 1;
      if (wk[w.date] <= XP.workoutsPerDay) {
        xp += XP.workout + Math.round(Math.min(w.minutes, XP.workoutMaxMin) * XP.workoutPerMin);
      }
    });
    return xp;
  }
  function questXp() {
    return Object.values(g().quests).reduce((s, a) => s + a.length, 0) * XP.quest;
  }
  function badgeXp() {
    return BADGES.reduce((s, b) => s + (g().badges[b.id] ? b.xp : 0), 0);
  }
  function totalXp() {
    return activityXp() + questXp() + badgeXp();
  }

  function rankFor(level) {
    let r = RANKS[0];
    RANKS.forEach(x => { if (level >= x.from) r = x; });
    return r;
  }

  function levelInfo(xp) {
    if (xp === undefined) xp = totalXp();
    let level = 1;
    while (xp >= xpFor(level + 1)) level++;
    const base = xpFor(level);
    const next = xpFor(level + 1);
    return { xp, level, into: xp - base, need: next - base, pct: (xp - base) / (next - base), rank: rankFor(level) };
  }

  /* ----- Objectifs du jour ----- */
  function proteinGoal() {
    const w = Store.latestWeight();
    return w ? Math.round(w.kg * 1.6) : 100;
  }
  const kcalGoal = () => Store.data.profile.kcalTarget || 2000;
  const minutesOn = date => Store.workoutsOn(date).reduce((s, w) => s + w.minutes, 0);

  const QUESTS = [
    { id: "meals3", icon: "utensils", state: d => { const n = Store.mealsOn(d).length; return { cur: n, max: 3, done: n >= 3 }; } },
    { id: "move", icon: "footprints", state: d => { const n = minutesOn(d); return { cur: n, max: MOVE_GOAL, done: n >= MOVE_GOAL, unit: "min" }; } },
    { id: "kcal", icon: "target", state: d => {
      const k = Math.round(Store.dayTotals(d).kcal);
      const t = kcalGoal();
      return { cur: k, max: t, done: k >= t * 0.9 && k <= t * 1.1, over: k > t * 1.1, unit: "kcal" };
    } },
    { id: "weigh", icon: "scale", state: d => { const n = Store.weightOn(d) ? 1 : 0; return { cur: n, max: 1, done: n === 1 }; } }
  ];

  function quests(date) {
    date = date || todayISO();
    const claimed = g().quests[date] || [];
    return QUESTS.map(q => Object.assign({ id: q.id, icon: q.icon, claimed: claimed.includes(q.id) }, q.state(date)));
  }

  function claimQuest(id, date) {
    date = date || todayISO();
    const q = quests(date).find(x => x.id === id);
    if (!q || !q.done || q.claimed) return false;
    (g().quests[date] = g().quests[date] || []).push(id);
    Store.save();
    return true;
  }

  /* ----- Statistiques & badges ----- */
  function stats() {
    const d = Store.data;
    const pg = proteinGoal();
    const protByDay = {};
    d.meals.forEach(m => { protByDay[m.date] = (protByDay[m.date] || 0) + m.protein; });
    return {
      meals: d.meals.length,
      workouts: d.workouts.length,
      weights: d.weights.length,
      minutes: d.workouts.reduce((s, w) => s + w.minutes, 0),
      streak: currentStreak(),
      bestStreak: bestStreak(),
      perfectDays: Object.values(g().quests).filter(a => a.length >= QUESTS.length).length,
      proteinDays: Object.values(protByDay).filter(p => p >= pg).length,
      level: levelInfo().level,
      flags: g().flags
    };
  }

  const flag = k => s => (s.flags[k] ? 1 : 0);
  const BADGES = [
    { id: "firstMeal", icon: "utensils", xp: 25, goal: 1, val: s => s.meals },
    { id: "firstWorkout", icon: "footprints", xp: 25, goal: 1, val: s => s.workouts },
    { id: "firstWeigh", icon: "scale", xp: 25, goal: 1, val: s => s.weights },
    { id: "bmiPro", icon: "calculator", xp: 25, goal: 1, val: flag("bmiSaved") },
    { id: "streak3", icon: "flame", xp: 50, goal: 3, val: s => s.bestStreak },
    { id: "streak7", icon: "rocket", xp: 100, goal: 7, val: s => s.bestStreak },
    { id: "streak30", icon: "orbit", xp: 300, goal: 30, val: s => s.bestStreak },
    { id: "workouts10", icon: "dumbbell", xp: 100, goal: 10, val: s => s.workouts },
    { id: "workouts50", icon: "weight", xp: 250, goal: 50, val: s => s.workouts },
    { id: "minutes600", icon: "timer", xp: 150, goal: 600, val: s => s.minutes },
    { id: "meals50", icon: "book-open", xp: 100, goal: 50, val: s => s.meals },
    { id: "protein", icon: "beef", xp: 50, goal: 1, val: s => s.proteinDays },
    { id: "perfect", icon: "badge-check", xp: 100, goal: 1, val: s => s.perfectDays },
    { id: "perfect7", icon: "medal", xp: 250, goal: 7, val: s => s.perfectDays },
    { id: "level5", icon: "star", xp: 0, goal: 5, val: s => s.level },
    { id: "level10", icon: "sparkles", xp: 0, goal: 10, val: s => s.level },
    { id: "explorer", icon: "palette", xp: 25, goal: 1, val: flag("themeChanged") },
    { id: "polyglot", icon: "languages", xp: 25, goal: 1, val: flag("langChanged") }
  ];

  function badges() {
    const s = stats();
    return BADGES.map(b => Object.assign({}, b, {
      cur: Math.min(b.val(s), b.goal),
      unlocked: !!g().badges[b.id],
      date: g().badges[b.id] || null
    }));
  }

  /** Débloque les nouveaux badges et détecte un passage de niveau. */
  function sync() {
    const newBadges = [];
    for (let pass = 0; pass < 3; pass++) {
      const s = stats();
      let changed = false;
      BADGES.forEach(b => {
        if (!g().badges[b.id] && b.val(s) >= b.goal) {
          g().badges[b.id] = todayISO();
          newBadges.push(b);
          changed = true;
        }
      });
      if (!changed) break;
    }
    const lvl = levelInfo().level;
    const levelUp = lvl > (g().lastLevel || 1) ? lvl : null;
    g().lastLevel = lvl;
    Store.save();
    return { newBadges, levelUp };
  }

  function setFlag(k) {
    if (!g().flags[k]) {
      g().flags[k] = true;
      Store.save();
    }
  }

  /** Calendrier d'activité : `weeks` colonnes de 7 jours (lundi → dimanche). */
  function heatmap(weeks) {
    weeks = weeks || 12;
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - (weeks - 1) * 7, 12);
    const counts = {};
    const bump = (d, n) => { counts[d] = (counts[d] || 0) + n; };
    Store.data.meals.forEach(m => bump(m.date, 1));
    Store.data.workouts.forEach(w => bump(w.date, 2));
    Store.data.weights.forEach(w => bump(w.date, 1));
    const today = todayISO();
    const out = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = toISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12));
      const n = counts[date] || 0;
      out.push({ date, n, lvl: n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4, future: date > today });
    }
    return out;
  }

  return {
    XP, RANKS, BADGES, DAILY_MOVE,
    totalXp, levelInfo, rankFor, quests, claimQuest, badges, stats, sync, setFlag,
    heatmap, proteinGoal, currentStreak, bestStreak, minutesOn
  };
})();
