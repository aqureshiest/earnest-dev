import { SpecificationsAssistant } from '../assistants/SpecificationsAssistant';
import { PlannerAssistant } from '../assistants/PlannerAssistant';
import { CodingAssistant } from '../assistants/CodingAssistant';
import { WriterAssistant } from '../assistants/WriterAssistant';
import { TestCase, SpecificationsTestCase, PlannerTestCase, CodingTestCase, WriterTestCase } from './TestCase';
import { ResponseEvaluator } from './ResponseEvaluator';
import { PerformanceMetrics } from './PerformanceMetrics';

export class TestRunner {
  private specificationsAssistant: SpecificationsAssistant;
  private plannerAssistant: PlannerAssistant;
  private codingAssistant: CodingAssistant;
  private writerAssistant: WriterAssistant;
  private responseEvaluator: ResponseEvaluator;
  private performanceMetrics: PerformanceMetrics;

  constructor() {
    this.specificationsAssistant = new SpecificationsAssistant();
    this.plannerAssistant = new PlannerAssistant();
    this.codingAssistant = new CodingAssistant();
    this.writerAssistant = new WriterAssistant();
    this.responseEvaluator = new ResponseEvaluator();
    this.performanceMetrics = new PerformanceMetrics();
  }

  async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    let result: AIAssistantResponse<any>;

    try {
      if ('expectedOutput' in testCase) {
        if ('steps' in testCase.expectedOutput) {
          result = await this.runPlannerTestCase(testCase as PlannerTestCase);
        } else if ('newFiles' in testCase.expectedOutput) {
          result = await this.runCodingTestCase(testCase as CodingTestCase);
        } else if ('title' in testCase.expectedOutput) {
          result = await this.runWriterTestCase(testCase as WriterTestCase);
        } else {
          result = await this.runSpecificationsTestCase(testCase as SpecificationsTestCase);
        }
      } else {
        throw new Error('Invalid test case type');
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const evaluationResults = this.responseEvaluator.evaluate(result.response, testCase.expectedOutput, testCase.evaluationCriteria);
      
      this.performanceMetrics.recordMetrics(testCase.id, executionTime, result.inputTokens, result.outputTokens, result.cost, evaluationResults);

      return {
        testCaseId: testCase.id,
        passed: Object.values(evaluationResults).every(result => result),
        executionTime,
        evaluationResults,
        response: result.response,
      };
    } catch (error) {
      console.error(`Error running test case ${testCase.id}:`, error);
      return {
        testCaseId: testCase.id,
        passed: false,
        executionTime: Date.now() - startTime,
        evaluationResults: {},
        error: error.message,
      };
    }
  }

  private async runSpecificationsTestCase(testCase: SpecificationsTestCase): Promise<AIAssistantResponse<Specifications>> {
    return this.specificationsAssistant.process({
      model: 'gpt-4',
      task: testCase.input.task,
      files: testCase.input.files,
    });
  }

  private async runPlannerTestCase(testCase: PlannerTestCase): Promise<AIAssistantResponse<ImplementationPlan>> {
    return this.plannerAssistant.process({
      model: 'gpt-4',
      task: testCase.input.task,
      files: testCase.input.files,
    });
  }

  private async runCodingTestCase(testCase: CodingTestCase): Promise<AIAssistantResponse<CodeChanges>> {
    return this.codingAssistant.process({
      model: 'gpt-4',
      task: testCase.input.task,
      files: testCase.input.files,
    });
  }

  private async runWriterTestCase(testCase: WriterTestCase): Promise<AIAssistantResponse<string>> {
    return this.writerAssistant.process({
      model: 'gpt-4',
      task: testCase.input.task,
      files: testCase.input.files,
    });
  }
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  executionTime: number;
  evaluationResults: { [key: string]: boolean };
  response?: any;
  error?: string;
}