/* =========================================================
   Icônes en ligne : Lucide (https://lucide.dev, licence ISC)
   servies par le CDN jsDelivr.

   Performance :
   - chaque icône est un petit SVG (~300 octets) téléchargé
     uniquement quand il est affiché, puis mis en cache
     (version figée = cache longue durée) ;
   - l'icône est appliquée en masque CSS : elle prend la couleur
     du texte (currentColor) et suit donc le thème.

   Utilisation :
   - HTML : <i data-ic="flame"></i>  (hydrateIcons() s'en charge)
   - JS   : icon("flame")             (renvoie le HTML)
   Liste des noms : https://lucide.dev/icons
   ========================================================= */
const ICON_BASE = "https://cdn.jsdelivr.net/npm/lucide-static@0.460.0/icons/";

function iconUrl(name) {
  return `url(${ICON_BASE}${name}.svg)`;
}

function icon(name, cls) {
  return `<i class="ic${cls ? " " + cls : ""}" style="--i:${iconUrl(name)}" aria-hidden="true"></i>`;
}

function hydrateIcons(root) {
  (root || document).querySelectorAll("i[data-ic]").forEach(el => {
    el.classList.add("ic");
    el.style.setProperty("--i", iconUrl(el.dataset.ic));
    el.setAttribute("aria-hidden", "true");
  });
}
