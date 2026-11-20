# Application sportive

Application web de suivi sportif et nutritionnel, en **HTML / CSS / JavaScript** (sans framework, sans installation), avec un design « Liquid Glass » inspiré d'Apple et un système de progression (XP, niveaux, quêtes, badges).

## Lancer l'application

1. Télécharger le projet (`Code` → `Download ZIP`) ou `git clone`.
2. Ouvrir **`index.html`** dans un navigateur.

> Les icônes (Lucide) et les graphiques (Chart.js) sont chargés depuis le CDN jsDelivr : une connexion Internet est nécessaire pour les voir.

Pour la mettre en ligne gratuitement : *Settings → Pages → Deploy from branch → `main`* (le dépôt doit être public, ou un compte GitHub Pro).

## Fonctionnalités (par ordre de priorité du cahier des charges)

| Priorité | Fonctionnalité | Où ? | Statut |
|---|---|---|---|
| 1 | Calcul de l'IMC (+ métabolisme, besoins caloriques, poids conseillé) | Onglet **IMC** | Fait |
| 2 | Interface web (style Liquid Glass, responsive, barre d'onglets en bas sur mobile) | `index.html`, `css/style.css` | Fait |
| 3 | Visualisation des statistiques (poids, calories vs objectif, macros, sport) | Onglet **Statistiques** | Fait |
| 4 | Recherche et filtrage d'aliments (texte, catégorie, kcal max, riche en protéines, tri) | Onglet **Aliments** | Fait |
| 5 | Affichage de l'app : fond (7 thèmes), forme (arrondie / carrée / très arrondie), taille du texte | Onglet **Paramètres** | Fait |
| 6 | Modélisation des données | `js/storage.js` (+ `sql/schema.sql`) | Fait |
| 7 | Langue anglais / français | Bouton **EN/FR** en haut à droite | Fait |
| 8 | Saisie manuelle (repas, pesées, séances de sport) | Onglet **Journal** | Fait |
| 8 | Saisie par IA | Onglet **Journal** (emplacement prévu) | Fin d'année |
| — | Gamification : XP, niveaux, rangs, séries, quêtes du jour, 18 badges | Accueil + onglet **Trophées** | Fait |
| — | Création de compte et profil utilisateur avec SQL | `sql/schema.sql` + onglet **Paramètres** | Plus tard dans l'année |

## Structure

```
index.html        Interface (7 onglets)
css/style.css     Style Liquid Glass, thèmes, formes, tailles de texte
js/icons.js       Icônes Lucide (CDN) appliquées en masque CSS
js/i18n.js        Traductions FR / EN
js/foods.js       Base d'aliments (valeurs pour 100 g)
js/storage.js     Modèle de données + sauvegarde (localStorage), import/export JSON
js/game.js        Gamification : XP, niveaux, séries, quêtes, badges
js/app.js         Logique : IMC, recherche, journal, statistiques, trophées, paramètres
sql/schema.sql    Schéma de base de données pour les futurs comptes utilisateurs
```

## Design et performance

- **Liquid Glass** : surfaces translucides avec liseré lumineux, fond coloré en dégradés CSS, barre d'onglets flottante.
- **Police système** (SF Pro sur Apple, Segoe UI sur Windows, Roboto sur Android) : aucun fichier de police à télécharger.
- **Icônes Lucide** depuis jsDelivr (version figée, mise en cache) : seules les icônes affichées sont téléchargées.
- **Chart.js chargé à la demande** : uniquement à l'ouverture de l'onglet Statistiques.
- Le flou (`backdrop-filter`), coûteux, est réservé à l'en-tête, aux onglets et aux fenêtres.
- Respect des réglages système « réduire la transparence » et « réduire les animations ».

## Gamification

- **XP** : repas +10 (6/jour max), pesée +15, séance +20 et +1 toutes les 2 min, quête récupérée +30, bonus des badges.
- Supprimer une entrée retire l'XP correspondante.
- **Niveaux** : XP cumulée = 50 × N × (N − 1). **Rangs** : Débutant, Échauffé, Athlète, Machine, Champion, Titan, Légende.
- **Série** : jours d'affilée avec au moins une entrée.

## Formules utilisées

- **IMC** = poids (kg) / taille (m)²  — catégories OMS : < 18,5 / 18,5–25 / 25–30 / ≥ 30
- **Métabolisme de base** (Mifflin-St Jeor) = 10 × poids + 6,25 × taille − 5 × âge + 5 (homme) ou − 161 (femme)
- **Dépense journalière** = métabolisme × coefficient d'activité (1,2 à 1,9)
- **Objectif** : −400 kcal (perte), +300 kcal (prise de muscle)
- **Calories brûlées** (sport) ≈ MET × poids × durée (h)

Résultats indicatifs, ne remplacent pas l'avis d'un professionnel de santé.

## Données

Toutes les données sont stockées **localement dans le navigateur** (localStorage). On peut les exporter / importer en JSON depuis *Paramètres*. Le passage à une base SQL avec comptes utilisateurs est prévu (voir `sql/schema.sql`).

## Crédits

- Icônes : [Lucide](https://lucide.dev) (licence ISC)
- Graphiques : [Chart.js](https://www.chartjs.org) (licence MIT)
