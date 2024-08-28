import { Specifications } from '../assistants/SpecificationsAssistant';
import { ImplementationPlan } from '../assistants/PlannerAssistant';
import { CodeChanges } from '../assistants/CodingAssistant';

export interface BaseTestCase {
  id: string;
  description: string;
  input: {
    task: string;
    files: FileDetails[];
  };
  evaluationCriteria: {
    [key: string]: (response: any) => boolean;
  };
}

export interface SpecificationsTestCase extends BaseTestCase {
  expectedOutput: Partial<Specifications>;
}

export interface PlannerTestCase extends BaseTestCase {
  expectedOutput: Partial<ImplementationPlan>;
}

export interface CodingTestCase extends BaseTestCase {
  expectedOutput: Partial<CodeChanges>;
}

export interface WriterTestCase extends BaseTestCase {
  expectedOutput: {
    title: string;
    content: string;
  };
}

export type TestCase = SpecificationsTestCase | PlannerTestCase | CodingTestCase | WriterTestCase;