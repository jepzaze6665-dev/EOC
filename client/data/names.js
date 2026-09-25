// Random character names for the creation screen ("Randomize").

export const NAME_POOL = [
  'Aldric', 'Sylva', 'Corvin', 'Mira', 'Thane', 'Lyra', 'Orrin', 'Vesper',
  'Kaelen', 'Riven', 'Sable', 'Elowen', 'Bryn', 'Noctis', 'Wren', 'Halric'
];

export function randomName() {
  const base = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
  return `${base}${Math.floor(Math.random() * 90) + 10}`;
}
