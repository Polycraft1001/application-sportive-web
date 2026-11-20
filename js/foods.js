/* =========================================================
   Base d'aliments (valeurs moyennes pour 100 g)
   kcal | protein (g) | carbs (g) | fat (g)
   ========================================================= */
const FOOD_CATEGORIES = {
  fruits:  { fr: "Fruits", en: "Fruit" },
  veg:     { fr: "Légumes", en: "Vegetables" },
  starch:  { fr: "Féculents", en: "Starchy foods" },
  meat:    { fr: "Viandes, poissons, œufs", en: "Meat, fish, eggs" },
  dairy:   { fr: "Produits laitiers", en: "Dairy" },
  legumes: { fr: "Légumineuses & soja", en: "Legumes & soy" },
  nuts:    { fr: "Oléagineux & matières grasses", en: "Nuts & fats" },
  snacks:  { fr: "Snacks & boissons", en: "Snacks & drinks" }
};

const FOODS = [
  // Fruits
  { id: "apple", fr: "Pomme", en: "Apple", cat: "fruits", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: "banana", fr: "Banane", en: "Banana", cat: "fruits", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: "orange", fr: "Orange", en: "Orange", cat: "fruits", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { id: "strawberry", fr: "Fraise", en: "Strawberry", cat: "fruits", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { id: "avocado", fr: "Avocat", en: "Avocado", cat: "fruits", kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { id: "applesauce", fr: "Compote sans sucre ajouté", en: "Unsweetened apple sauce", cat: "fruits", kcal: 50, protein: 0.3, carbs: 11, fat: 0.1 },

  // Légumes
  { id: "broccoli", fr: "Brocoli", en: "Broccoli", cat: "veg", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { id: "carrot", fr: "Carotte", en: "Carrot", cat: "veg", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { id: "spinach", fr: "Épinards", en: "Spinach", cat: "veg", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { id: "tomato", fr: "Tomate", en: "Tomato", cat: "veg", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { id: "greenbeans", fr: "Haricots verts", en: "Green beans", cat: "veg", kcal: 31, protein: 1.8, carbs: 7, fat: 0.2 },
  { id: "zucchini", fr: "Courgette", en: "Courgette", cat: "veg", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },

  // Féculents
  { id: "rice", fr: "Riz blanc (cuit)", en: "White rice (cooked)", cat: "starch", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "pasta", fr: "Pâtes (cuites)", en: "Pasta (cooked)", cat: "starch", kcal: 131, protein: 5, carbs: 25, fat: 1.1 },
  { id: "potato", fr: "Pomme de terre (cuite)", en: "Potato (boiled)", cat: "starch", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { id: "sweetpotato", fr: "Patate douce (cuite)", en: "Sweet potato (cooked)", cat: "starch", kcal: 90, protein: 2, carbs: 21, fat: 0.2 },
  { id: "wholebread", fr: "Pain complet", en: "Wholemeal bread", cat: "starch", kcal: 247, protein: 13, carbs: 41, fat: 3.4 },
  { id: "baguette", fr: "Baguette", en: "Baguette", cat: "starch", kcal: 270, protein: 9, carbs: 55, fat: 1.5 },
  { id: "oats", fr: "Flocons d'avoine", en: "Rolled oats", cat: "starch", kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { id: "quinoa", fr: "Quinoa (cuit)", en: "Quinoa (cooked)", cat: "starch", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },

  // Viandes, poissons, œufs
  { id: "chicken", fr: "Blanc de poulet (cuit)", en: "Chicken breast (cooked)", cat: "meat", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "turkey", fr: "Escalope de dinde", en: "Turkey cutlet", cat: "meat", kcal: 135, protein: 29, carbs: 0, fat: 1.5 },
  { id: "beef5", fr: "Steak haché 5 %", en: "Lean minced beef 5%", cat: "meat", kcal: 137, protein: 21, carbs: 0, fat: 5 },
  { id: "ham", fr: "Jambon blanc", en: "Cooked ham", cat: "meat", kcal: 115, protein: 20, carbs: 1, fat: 3.5 },
  { id: "salmon", fr: "Saumon", en: "Salmon", cat: "meat", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { id: "tuna", fr: "Thon au naturel", en: "Tuna in water", cat: "meat", kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { id: "cod", fr: "Cabillaud", en: "Cod", cat: "meat", kcal: 82, protein: 18, carbs: 0, fat: 0.7 },
  { id: "egg", fr: "Œuf", en: "Egg", cat: "meat", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },

  // Produits laitiers
  { id: "milk", fr: "Lait demi-écrémé", en: "Semi-skimmed milk", cat: "dairy", kcal: 46, protein: 3.3, carbs: 4.8, fat: 1.6 },
  { id: "yogurt", fr: "Yaourt nature", en: "Plain yoghurt", cat: "dairy", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { id: "fromageblanc", fr: "Fromage blanc 0 %", en: "Fat-free fromage blanc", cat: "dairy", kcal: 45, protein: 7.5, carbs: 4, fat: 0.2 },
  { id: "skyr", fr: "Skyr", en: "Skyr", cat: "dairy", kcal: 63, protein: 11, carbs: 4, fat: 0.2 },
  { id: "emmental", fr: "Emmental", en: "Emmental cheese", cat: "dairy", kcal: 380, protein: 28, carbs: 0, fat: 29 },
  { id: "mozzarella", fr: "Mozzarella", en: "Mozzarella", cat: "dairy", kcal: 280, protein: 22, carbs: 2.2, fat: 20 },

  // Légumineuses & soja
  { id: "lentils", fr: "Lentilles (cuites)", en: "Lentils (cooked)", cat: "legumes", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { id: "chickpeas", fr: "Pois chiches (cuits)", en: "Chickpeas (cooked)", cat: "legumes", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { id: "kidneybeans", fr: "Haricots rouges (cuits)", en: "Kidney beans (cooked)", cat: "legumes", kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5 },
  { id: "tofu", fr: "Tofu", en: "Tofu", cat: "legumes", kcal: 144, protein: 15.8, carbs: 2.8, fat: 8.7 },

  // Oléagineux & matières grasses
  { id: "almonds", fr: "Amandes", en: "Almonds", cat: "nuts", kcal: 579, protein: 21, carbs: 22, fat: 50 },
  { id: "walnuts", fr: "Noix", en: "Walnuts", cat: "nuts", kcal: 654, protein: 15, carbs: 14, fat: 65 },
  { id: "peanutbutter", fr: "Beurre de cacahuète", en: "Peanut butter", cat: "nuts", kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { id: "oliveoil", fr: "Huile d'olive", en: "Olive oil", cat: "nuts", kcal: 884, protein: 0, carbs: 0, fat: 100 },

  // Snacks & boissons
  { id: "darkchoc", fr: "Chocolat noir 70 %", en: "Dark chocolate 70%", cat: "snacks", kcal: 598, protein: 7.8, carbs: 46, fat: 43 },
  { id: "cerealbar", fr: "Barre de céréales", en: "Cereal bar", cat: "snacks", kcal: 400, protein: 6, carbs: 70, fat: 10 },
  { id: "whey", fr: "Protéine en poudre (whey)", en: "Whey protein powder", cat: "snacks", kcal: 380, protein: 75, carbs: 8, fat: 5 },
  { id: "oj", fr: "Jus d'orange", en: "Orange juice", cat: "snacks", kcal: 45, protein: 0.7, carbs: 10, fat: 0.2 },
  { id: "soda", fr: "Soda", en: "Soft drink", cat: "snacks", kcal: 42, protein: 0, carbs: 10.6, fat: 0 }
];
