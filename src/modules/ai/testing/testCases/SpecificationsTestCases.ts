import { SpecificationsTestCase } from '../TestCase';

export const specificationsTestCases: SpecificationsTestCase[] = [
  {
    id: 'SPEC_001',
    description: 'Generate specifications for a simple task',
    input: {
      task: 'Create a function to calculate the factorial of a number',
      files: [],
    },
    expectedOutput: {
      specifications: [
        {
          title: 'Implement Factorial Function',
          summary: 'Create a function that calculates the factorial of a given number',
          key_steps: [
            'Define a function named calculateFactorial that takes a single parameter',
            'Implement error handling for invalid inputs',
            'Use a loop or recursion to calculate the factorial',
            'Return the calculated factorial',
          ],
        },
      ],
    },
    evaluationCriteria: {
      hasCorrectStructure: (response) => 
        Array.isArray(response.specifications) && 
        response.specifications.every((spec: any) => 
          'title' in spec && 'summary' in spec && 'key_steps' in spec
        ),
      containsKeyElements: (response) => 
        ResponseEvaluator.contentRelevance(response, ['factorial', 'function', 'calculate']),
      hasRequiredSteps: (response) => 
        ResponseEvaluator.completeness(response, ['specifications[0].key_steps']),
    },
  },
  // Add more test cases here
];