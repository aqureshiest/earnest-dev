import { CodingTestCase } from '../TestCase';

export const codingTestCases: CodingTestCase[] = [
  {
    id: 'CODE_001',
    description: 'Generate code for a simple utility function',
    input: {
      task: 'Implement a function to check if a number is prime',
      files: [],
    },
    expectedOutput: {
      newFiles: [
        {
          path: 'src/utils/mathUtils.ts',
          content: `
export function isPrime(num: number): boolean {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}
          `.trim(),
        },
      ],
    },
    evaluationCriteria: {
      hasCorrectFileStructure: (response) => 
        Array.isArray(response.newFiles) && 
        response.newFiles.some((file: any) => file.path === 'src/utils/mathUtils.ts'),
      containsKeyElements: (response) => 
        ResponseEvaluator.contentRelevance(response, ['function', 'isPrime', 'number', 'boolean']),
      implementsCorrectLogic: (response) => {
        const fileContent = response.newFiles.find((file: any) => file.path === 'src/utils/mathUtils.ts')?.content;
        return fileContent && fileContent.includes('Math.sqrt(num)') && fileContent.includes('num % i === 0');
      },
    },
  },
  // Add more test cases here
];