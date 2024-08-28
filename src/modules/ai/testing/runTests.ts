import { TestRunner } from './TestRunner';
import { ReportGenerator } from './ReportGenerator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { specificationsTestCases } from './testCases/SpecificationsTestCases';
import { plannerTestCases } from './testCases/PlannerTestCases';
import { codingTestCases } from './testCases/CodingTestCases';
import { writerTestCases } from './testCases/WriterTestCases';
import { config } from './config';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const testRunner = new TestRunner();
  const performanceMetrics = new PerformanceMetrics();
  const reportGenerator = new ReportGenerator(performanceMetrics);

  const allTestCases = [
    ...specificationsTestCases,
    ...plannerTestCases,
    ...codingTestCases,
    ...writerTestCases,
  ];

  console.log(`Starting test run with ${allTestCases.length} test cases...`);

  const results = [];
  for (const testCase of allTestCases) {
    console.log(`Running test case: ${testCase.id}`);
    const result = await testRunner.runTestCase(testCase);
    results.push(result);

    // Add a delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, config.testing.rateLimitDelay));
  }

  console.log('All tests completed. Generating report...');

  const report = reportGenerator.generateReport(allTestCases, results);

  // Save the report to a file
  const reportDir = path.join(__dirname, '..', '..', '..', '..', 'test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, `ai_assistant_test_report_${new Date().toISOString().replace(/:/g, '-')}.txt`);
  fs.writeFileSync(reportPath, report);

  console.log(`Test report saved to: ${reportPath}`);
  console.log('\nTest Report Summary:');
  console.log(performanceMetrics.getMetricsSummary());
}

runTests().catch(error => {
  console.error('An error occurred while running tests:', error);
  process.exit(1);
});