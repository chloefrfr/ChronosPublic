export function getRandomAction(min: number = 1, max: number = 26): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
