export const itemTypeProbabilities = generateRandomProbabilities(5);
export const rarityProbabilities = generateRandomProbabilities(5);

function generateRandomProbabilities(length: number): number[] {
  const probabilities: number[] = [];

  for (let i = 0; i < length; i++) {
    probabilities.push(Math.random());
  }

  return probabilities;
}
