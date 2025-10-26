// Config opzionale per ordinare/rinominare/nascondere campi per categoria.
// Se una chiave non esiste nei dati, viene ignorata automaticamente.

const commonHide = ['index', 'url'];

const byCategory = {
  spells: {
    fieldOrder: [
      'level', 'school', 'casting_time', 'range', 'duration',
      'components', 'material', 'ritual', 'concentration'
    ],
    aliases: {
      level: 'Livello',
      school: 'Scuola',
      casting_time: 'Tempo di lancio',
      range: 'Raggio',
      duration: 'Durata',
      components: 'Componenti',
      material: 'Materiale',
      ritual: 'Rituale',
      concentration: 'Concentrazione'
    },
    hide: [...commonHide]
  },
  monsters: {
    fieldOrder: [
      'size', 'type', 'subtype', 'alignment',
      'armor_class', 'hit_points', 'hit_dice', 'speed', 'languages', 'challenge_rating'
    ],
    aliases: {
      size: 'Taglia',
      type: 'Tipo',
      subtype: 'Sottotipo',
      alignment: 'Allineamento',
      armor_class: 'CA',
      hit_points: 'PF',
      hit_dice: 'Dadi Vita',
      speed: 'Velocità',
      languages: 'Linguaggi',
      challenge_rating: 'Grado Sfida'
    },
    hide: [...commonHide]
  }
  // Aggiungi qui altre categorie se vuoi (equipment, classes, backgrounds, ...)
};

export function getLayoutForCategory(category) {
  return byCategory[category] || null;
}

export function aliasFor(key) {
  // Prova a trovare un alias in tutte le categorie (fallback leggero)
  for (const k of Object.keys(byCategory)) {
    const a = byCategory[k].aliases?.[key];
    if (a) return a;
  }
  return null;
}

export function shouldHideKey(key) {
  if (commonHide.includes(key)) return true;
  for (const k of Object.keys(byCategory)) {
    if (byCategory[k].hide?.includes(key)) return true;
  }
  return false;
}