// Character presets = appearance only. Class is chosen separately so that any
// preset can wear any class kit (and later: any cosmetic / equipment).

export const PRESETS = [
  { id: 'p01', label: 'Ashen Drifter', skin: '#e7b18b', hair: '#2f2118', hairStyle: 'short', accent: '#c3cbdd' },
  { id: 'p02', label: 'Emberborn', skin: '#c98a5e', hair: '#7a2f22', hairStyle: 'long', accent: '#e0a06a' },
  { id: 'p03', label: 'Moonlit Scholar', skin: '#f0d2b8', hair: '#d6d0e6', hairStyle: 'ponytail', accent: '#9d9ad8' },
  { id: 'p04', label: 'Duskwood Ranger', skin: '#a9744c', hair: '#1d1a16', hairStyle: 'braid', accent: '#8fb37a' },
  { id: 'p05', label: 'Ironvale Native', skin: '#8c5a3c', hair: '#2b2b33', hairStyle: 'bald', accent: '#b9b9c6' },
  { id: 'p06', label: 'Starfall Nomad', skin: '#e9c9a8', hair: '#c9a227', hairStyle: 'hood', accent: '#d7b3e8' }
];

export const NAME_POOL = [
  'Aldric', 'Sylva', 'Corvin', 'Mira', 'Thane', 'Lyra', 'Orrin', 'Vesper',
  'Kaelen', 'Riven', 'Sable', 'Elowen', 'Bryn', 'Noctis', 'Wren', 'Halric'
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

export function randomPreset() {
  return PRESETS[Math.floor(Math.random() * PRESETS.length)];
}

export function randomName() {
  const base = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
  return `${base}${Math.floor(Math.random() * 90) + 10}`;
}
