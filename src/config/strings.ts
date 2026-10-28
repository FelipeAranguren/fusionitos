/** Todos los textos de la UI. Los pisos se reciben como índice (0..) y se muestran desde 1. */
export const STRINGS = {
  title: 'Fusionitos',

  floorLabel: (floor: number, name: string) => `Piso ${floor + 1} · ${name}`,
  incomePerSecond: (amount: string) => `+${amount}/s`,
  coinPop: (amount: string) => `+${amount}`,
  capacity: (count: number, max: number) => `${count}/${max}`,
  hint: 'Tocá los huevos · Arrastrá dos iguales para fusionarlas',
  fieldFull: '¡Campo lleno! Fusioná criaturas para hacer lugar',

  discoveryTitle: '¡Nueva criatura descubierta!',
  discoveryDetail: (floor: number, floorName: string, tier: number) =>
    `Piso ${floor + 1} · ${floorName} · Nivel ${tier}`,
  discoveryIncome: (amount: string) => `Produce ${amount} ${amount === '1' ? 'moneda' : 'monedas'} por segundo`,
  discoveryOk: '¡Genial!',

  reset: 'Reiniciar',
  resetTitle: '¿Reiniciar el juego?',
  resetBody: 'Vas a perder todas tus criaturas,\nmonedas y descubrimientos.',
  resetConfirm: 'Sí, reiniciar',
  resetCancel: 'Cancelar',

  floorTab: (floor: number) => `Piso ${floor + 1}`,
  floorLocked: (floor: number, creatureName: string) =>
    `🔒 Para abrir el Piso ${floor + 1}: fusioná ${creatureName} + ${creatureName}`,
  upperFloorHint: (floorBelow: number) => `Recibe criaturas de los merges del Piso ${floorBelow + 1}`,
  floorUnlocked: (floor: number, name: string) => `🔓 ¡Piso ${floor + 1} desbloqueado: ${name}!`,
  movedUp: (floor: number) => `⬆️ ¡Al Piso ${floor + 1}!`,
  floorFull: (floor: number) => `El Piso ${floor + 1} está lleno`,
  maxLevel: '¡Nivel máximo! Esta criatura ya no evoluciona',
  saveFailed: 'No se puede guardar el progreso en este navegador',
} as const;
