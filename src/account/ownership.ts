/**
 * Si esta apertura del juego puede subir la partida a la nube.
 * La partida la usa la última apertura que la abrió (`owner`, guardado junto a la partida): si otra la abrió
 * después, esta deja de subir, así una pestaña vieja no pisa lo que se jugó en otro lado.
 * Si al abrir no había conexión, esta apertura todavía no la tomó (`claimed` en false): la primera subida
 * que funcione la toma, así que gana la última que se conecta.
 */
export function canPush(claimed: boolean, owner: unknown, session: string): boolean {
  return !claimed || typeof owner !== 'string' || owner === session;
}
