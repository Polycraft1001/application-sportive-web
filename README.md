# 🏃 Application sportive

Application web de suivi sportif et nutritionnel, en **HTML / CSS / JavaScript** (sans framework, sans installation).

## ▶️ Lancer l'application

1. Télécharger le projet (`Code` → `Download ZIP`) ou `git clone`.
2. Ouvrir **`index.html`** dans un navigateur.

> Les graphiques utilisent Chart.js via CDN : une connexion Internet est nécessaire pour l'onglet Statistiques.

Pour la mettre en ligne gratuitement : *Settings → Pages → Deploy from branch → `main`* (le dépôt doit être public, ou un compte GitHub Pro).

## ✅ Fonctionnalités (par ordre de priorité du cahier des charges)

| Priorité | Fonctionnalité | Où ? | Statut |
|---|---|---|---|
| 1 | Calcul de l'IMC (+ métabolisme, besoins caloriques, poids conseillé) | Onglet **IMC** | ✅ |
| 2 | Interface web | `index.html`, `css/style.css` | ✅ |
| 3 | Visualisation des statistiques (poids, calories vs objectif, macros, sport) | Onglet **Statistiques** | ✅ |
| 4 | Recherche et filtrage d'aliments (texte, catégorie, kcal max, riche en protéines, tri) | Onglet **Aliments** | ✅ |
| 5 | Affichage de l'app : fond (5 thèmes), forme (arrondie / carrée / très arrondie), taille du texte | Onglet **Paramètres** | ✅ |
| 6 | Modélisation des données | `js/storage.js` (+ `sql/schema.sql`) | ✅ |
| 7 | Langue anglais / français | Bouton **EN/FR** en haut à droite | ✅ |
| 8 | Saisie manuelle (repas, pesées, séances de sport) | Onglet **Journal** | ✅ |
| 8 | Saisie par IA | Onglet **Journal** (emplacement prévu) | 🔜 fin d'année |
| — | Création de compte et profil utilisateur avec SQL | `sql/schema.sql` + onglet **Paramètres** | 🔜 plus tard dans l'année |

## 📁 Structure

```
index.html        Interface (6 onglets)
css/style.css     Styles, thèmes, formes, tailles de texte
js/i18n.js        Traductions FR / EN
js/foods.js       Base d'aliments (valeurs pour 100 g)
js/storage.js     Modèle de données + sauvegarde (localStorage), import/export JSON
js/app.js         Logique : IMC, recherche, journal, statistiques, paramètres
sql/schema.sql    Schéma de base de données pour les futurs comptes utilisateurs
```

## 🧮 Formules utilisées

- **IMC** = poids (kg) / taille (m)²  — catégories OMS : < 18,5 / 18,5–25 / 25–30 / ≥ 30
- **Métabolisme de base** (Mifflin-St Jeor) = 10 × poids + 6,25 × taille − 5 × âge + 5 (homme) ou − 161 (femme)
- **Dépense journalière** = métabolisme × coefficient d'activité (1,2 à 1,9)
- **Objectif** : −400 kcal (perte), +300 kcal (prise de muscle)
- **Calories brûlées** (sport) ≈ MET × poids × durée (h)

⚠️ Résultats indicatifs, ne remplacent pas l'avis d'un professionnel de santé.

## 💾 Données

Toutes les données sont stockées **localement dans le navigateur** (localStorage). On peut les exporter / importer en JSON depuis *Paramètres*. Le passage à une base SQL avec comptes utilisateurs est prévu (voir `sql/schema.sql`).
