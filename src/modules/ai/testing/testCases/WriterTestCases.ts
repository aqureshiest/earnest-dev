import { WriterTestCase } from '../TestCase';

export const writerTestCases: WriterTestCase[] = [
  {
    id: 'WRITER_001',
    description: 'Generate PR description for a new feature',
    input: {
      task: 'Implement user authentication',
      files: [
        {
          path: 'src/auth/UserAuth.ts',
          content: '// New file content...',
        },
        {
          path: 'src/components/LoginForm.tsx',
          content: '// Modified file content...',
        },
      ],
    },
    expectedOutput: {
      title: 'Implement User Authentication',
      content: `
# User Authentication Implementation

This PR introduces user authentication functionality to the application.

## Changes:
- Created new file: \`src/auth/UserAuth.ts\` for handling authentication logic
- Modified \`src/components/LoginForm.tsx\` to integrate with the new authentication system

## Testing:
- Unit tests have been added for the authentication logic
- Manual testing has been performed to ensure smooth login/logout flow

Please review and provide feedback on the implementation approach and any potential security considerations.
      `.trim(),
    },
    evaluationCriteria: {
      hasCorrectStructure: (response) => 
        typeof response === 'string' && 
        response.includes('# User Authentication Implementation'),
      mentionsKeyFiles: (response) => 
        response.includes('src/auth/UserAuth.ts') && 
        response.includes('src/components/LoginForm.tsx'),
      includesTestingInfo: (response) => 
        response.toLowerCase().includes('test') && 
        (response.toLowerCase().includes('unit test') || response.toLowerCase().includes('manual testing')),
      requestsFeedback: (response) => 
        response.toLowerCase().includes('review') && 
        response.toLowerCase().includes('feedback'),
    },
  },
  // Add more test cases here
];