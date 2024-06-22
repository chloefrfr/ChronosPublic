export default function getRandomWeightedIndex(probabilities: number[]): number {
  const totalProbability = probabilities.reduce((acc, prob) => acc + prob, 0);
  const threshold = Math.random() * totalProbability;
  let sum = 0;
  for (let i = 0; i < probabilities.length; i++) {
    sum += probabilities[i];
    if (threshold < sum) {
      return i;
    }
  }
  return probabilities.length - 1;
}
