export const CATEGORY_LABELS_IT = {
  "ability-scores": "Punteggi di Caratteristica",
  "alignments": "Allineamenti",
  "backgrounds": "Background",
  "classes": "Classi",
  "conditions": "Condizioni",
  "damage-types": "Tipologie di danno",
  "equipment": "Equipaggiamento",
  "equipment-categories": "Equipaggiamento categorie",
  "feats": "Talenti",
  "features": "Privilegio di classe",
  "languages": "Linguaggi",
  "magic-items": "Oggetti magici",
  "magic-schools": "Scuole di magia",
  "monsters": "Mostri",
  "proficiencies": "Competenze",
  "races": "Razze",
  "rule-sections": "Regolamento",
  "rules": "Regole",
  "skills": "Abilità",
  "spells": "Incantesimi",
  "subclasses": "Sottoclassi",
  "subraces": "Sottorazze",
  "traits": "Tratti",
  "weapon-properties": "Proprietà delle armi"
};

export function categoryLabelFor(key) {
  return CATEGORY_LABELS_IT[key] ?? key;
}