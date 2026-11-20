/* =========================================================
   Modélisation des données + stockage local (localStorage)

   Modèle :
   {
     version: 1,
     profile:  { name, sex, age, heightCm, activity, goal, kcalTarget },
     settings: { lang, theme, shape, font },
     weights:  [{ id, date, kg }],
     meals:    [{ id, date, mealType, name, grams, kcal, protein, carbs, fat, foodId }],
     workouts: [{ id, date, type, minutes, kcal }],
     game:     { badges: { id: date }, quests: { date: [questId] }, flags: {}, lastLevel }
   }
   Les dates sont au format ISO "AAAA-MM-JJ" (heure locale).
   Ce modèle correspond aux tables du fichier sql/schema.sql
   (prévu pour la création de compte plus tard dans l'année).
   ========================================================= */
const STORAGE_KEY = "appSportive.v1";

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return toISO(new Date());
}

/** Renvoie les n derniers jours (du plus ancien à aujourd'hui). */
function lastNDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12)));
  }
  return out;
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

function isObj(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function defaultData() {
  return {
    version: 1,
    profile: { name: "", sex: "m", age: null, heightCm: null, activity: 1.55, goal: "maintain", kcalTarget: 2000 },
    settings: { lang: "fr", theme: "neon", shape: "rounded", font: "medium" },
    weights: [],
    meals: [],
    workouts: [],
    game: { badges: {}, quests: {}, flags: {}, lastLevel: 1 }
  };
}

const Store = {
  data: null,

  load() {
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      parsed = null;
    }
    this.data = this._merge(parsed);
    return this.data;
  },

  _merge(p) {
    const d = defaultData();
    if (!p || typeof p !== "object") return d;
    const pg = isObj(p.game) ? p.game : {};
    const quests = {};
    if (isObj(pg.quests)) {
      Object.keys(pg.quests).forEach(k => {
        if (Array.isArray(pg.quests[k])) quests[k] = pg.quests[k].filter(x => typeof x === "string");
      });
    }
    return {
      version: d.version,
      profile: { ...d.profile, ...(p.profile || {}) },
      settings: { ...d.settings, ...(p.settings || {}) },
      weights: Array.isArray(p.weights) ? p.weights : [],
      meals: Array.isArray(p.meals) ? p.meals : [],
      workouts: Array.isArray(p.workouts) ? p.workouts : [],
      game: {
        badges: isObj(pg.badges) ? pg.badges : {},
        quests,
        flags: isObj(pg.flags) ? pg.flags : {},
        lastLevel: Math.max(1, parseInt(pg.lastLevel, 10) || 1)
      }
    };
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Sauvegarde impossible :", e);
    }
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* ----- Ajouts ----- */
  addMeal(meal) {
    const m = {
      id: this.uid(),
      date: meal.date || todayISO(),
      mealType: meal.mealType || "lunch",
      name: String(meal.name || "").trim().slice(0, 80),
      grams: num(meal.grams),
      kcal: num(meal.kcal),
      protein: num(meal.protein),
      carbs: num(meal.carbs),
      fat: num(meal.fat),
      foodId: meal.foodId || null
    };
    this.data.meals.push(m);
    this.save();
    return m;
  },

  /** Une seule pesée par jour : la nouvelle remplace l'ancienne. */
  addWeight(date, kg) {
    const existing = this.data.weights.find(w => w.date === date);
    if (existing) existing.kg = num(kg);
    else this.data.weights.push({ id: this.uid(), date, kg: num(kg) });
    this.data.weights.sort((a, b) => a.date.localeCompare(b.date));
    this.save();
  },

  addWorkout(w) {
    const entry = {
      id: this.uid(),
      date: w.date || todayISO(),
      type: w.type || "other",
      minutes: num(w.minutes),
      kcal: num(w.kcal)
    };
    this.data.workouts.push(entry);
    this.save();
    return entry;
  },

  remove(collection, id) {
    if (!Array.isArray(this.data[collection])) return;
    this.data[collection] = this.data[collection].filter(e => e.id !== id);
    this.save();
  },

  /* ----- Lectures ----- */
  mealsOn(date) { return this.data.meals.filter(m => m.date === date); },
  workoutsOn(date) { return this.data.workouts.filter(w => w.date === date); },
  weightOn(date) { return this.data.weights.find(w => w.date === date) || null; },

  latestWeight() {
    const today = todayISO();
    const past = this.data.weights.filter(w => w.date <= today);
    return past.length ? past[past.length - 1] : null;
  },

  dayTotals(date) {
    return this.mealsOn(date).reduce(
      (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },

  /* ----- Import / export ----- */
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },

  importJSON(text) {
    const p = JSON.parse(text);
    if (!p || typeof p !== "object" || !p.profile) throw new Error("invalid");
    this.data = this._merge(p);
    this.save();
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = defaultData();
  }
};
