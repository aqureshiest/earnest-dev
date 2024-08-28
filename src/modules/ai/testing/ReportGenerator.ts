import { TestCase } from './TestCase';
import { PerformanceMetrics } from './PerformanceMetrics';

interface TestResult {
  testCaseId: string;
  passed: boolean;
  executionTime: number;
  evaluationResults: { [key: string]: boolean };
  response?: any;
  error?: string;
}

export class ReportGenerator {
  private performanceMetrics: PerformanceMetrics;

  constructor(performanceMetrics: PerformanceMetrics) {
    this.performanceMetrics = performanceMetrics;
  }

  generateReport(testCases: TestCase[], results: TestResult[]): string {
    const overallSummary = this.generateOverallSummary(results);
    const detailedResults = this.generateDetailedResults(testCases, results);
    const performanceMetrics = this.performanceMetrics.getMetricsSummary();

    return `
AI Assistant Test Report
========================

${overallSummary}

${performanceMetrics}

Detailed Test Results
---------------------

${detailedResults}
    `.trim();
  }

  private generateOverallSummary(results: TestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    return `
Overall Summary:
----------------
Total Tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%
    `.trim();
  }

  private generateDetailedResults(testCases: TestCase[], results: TestResult[]): string {
    return testCases.map((testCase, index) => {
      const result = results[index];
      return `
Test Case: ${testCase.id}
Description: ${testCase.description}
Status: ${result.passed ? 'PASSED' : 'FAILED'}
Execution Time: ${result.executionTime} ms

Evaluation Results:
${Object.entries(result.evaluationResults)
  .map(([criteria, passed]) => `- ${criteria}: ${passed ? 'PASSED' : 'FAILED'}`)
  .join('\n')}

${result.error ? `Error: ${result.error}` : ''}

Response:
${JSON.stringify(result.response, null, 2)}

---
      `.trim();
    }).join('\n\n');
  }
}