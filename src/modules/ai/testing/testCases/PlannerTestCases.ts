import { PlannerTestCase } from '../TestCase';

export const plannerTestCases: PlannerTestCase[] = [
  {
    id: 'PLAN_001',
    description: 'Generate implementation plan for a simple task',
    input: {
      task: 'Implement a function to reverse a string',
      files: [],
    },
    expectedOutput: {
      steps: [
        {
          title: 'Create Reverse String Function',
          files: [
            {
              path: 'src/utils/stringUtils.ts',
              operation: 'new',
              todos: [
                'Define a function named reverseString that takes a string parameter',
                'Implement the logic to reverse the string',
                'Return the reversed string',
              ],
            },
          ],
        },
        {
          title: 'Add Unit Tests',
          files: [
            {
              path: 'tests/utils/stringUtils.test.ts',
              operation: 'new',
              todos: [
                'Create unit tests for the reverseString function',
                'Test with various input scenarios including empty string and long strings',
              ],
            },
          ],
        },
      ],
    },
    evaluationCriteria: {
      hasCorrectStructure: (response) => 
        Array.isArray(response.steps) && 
        response.steps.every((step: any) => 
          'title' in step && 'files' in step && Array.isArray(step.files)
        ),
      containsKeyElements: (response) => 
        ResponseEvaluator.contentRelevance(response, ['reverse', 'string', 'function', 'test']),
      hasRequiredSteps: (response) => 
        response.steps.length >= 2 && 
        response.steps.some((step: any) => step.title.toLowerCase().includes('test')),
    },
  },
  // Add more test cases here
];