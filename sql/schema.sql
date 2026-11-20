-- =========================================================
-- Application sportive — Schéma SQL (étape suivante)
-- Création de compte et profil utilisateur, prévu plus tard dans l'année.
-- Compatible PostgreSQL. Reprend le modèle de js/storage.js.
-- =========================================================

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,          -- jamais le mot de passe en clair (bcrypt/argon2)
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name   VARCHAR(40),
    sex          CHAR(1)      CHECK (sex IN ('m', 'f')),
    age          SMALLINT     CHECK (age BETWEEN 10 AND 100),
    height_cm    SMALLINT     CHECK (height_cm BETWEEN 100 AND 250),
    activity     NUMERIC(4,3) NOT NULL DEFAULT 1.55,
    goal         VARCHAR(10)  NOT NULL DEFAULT 'maintain' CHECK (goal IN ('lose', 'maintain', 'gain')),
    kcal_target  SMALLINT     NOT NULL DEFAULT 2000,
    lang         CHAR(2)      NOT NULL DEFAULT 'fr' CHECK (lang IN ('fr', 'en')),
    theme        VARCHAR(10)  NOT NULL DEFAULT 'light',
    shape        VARCHAR(10)  NOT NULL DEFAULT 'rounded',
    font         VARCHAR(10)  NOT NULL DEFAULT 'medium'
);

CREATE TABLE weights (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day       DATE         NOT NULL,
    kg        NUMERIC(5,1) NOT NULL CHECK (kg > 0),
    UNIQUE (user_id, day)                         -- une pesée par jour
);

CREATE TABLE meals (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day        DATE         NOT NULL,
    meal_type  VARCHAR(10)  NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
    name       VARCHAR(80)  NOT NULL,
    grams      NUMERIC(6,1) DEFAULT 0,
    kcal       NUMERIC(6,1) NOT NULL DEFAULT 0,
    protein    NUMERIC(6,1) NOT NULL DEFAULT 0,
    carbs      NUMERIC(6,1) NOT NULL DEFAULT 0,
    fat        NUMERIC(6,1) NOT NULL DEFAULT 0,
    food_id    VARCHAR(40)                          -- référence à la base d'aliments (optionnel)
);

CREATE TABLE workouts (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day       DATE         NOT NULL,
    type      VARCHAR(20)  NOT NULL,
    minutes   NUMERIC(5,1) NOT NULL CHECK (minutes > 0),
    kcal      NUMERIC(6,1) NOT NULL DEFAULT 0
);

CREATE INDEX idx_meals_user_day    ON meals (user_id, day);
CREATE INDEX idx_workouts_user_day ON workouts (user_id, day);
