export class PerformanceMetrics {
  private metrics: {
    [testCaseId: string]: {
      executionTime: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      evaluationResults: { [key: string]: boolean };
    };
  } = {};

  recordMetrics(
    testCaseId: string,
    executionTime: number,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    evaluationResults: { [key: string]: boolean }
  ) {
    this.metrics[testCaseId] = {
      executionTime,
      inputTokens,
      outputTokens,
      cost,
      evaluationResults,
    };
  }

  getAverageExecutionTime(): number {
    const times = Object.values(this.metrics).map(m => m.executionTime);
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getTotalCost(): number {
    return Object.values(this.metrics).reduce((sum, m) => sum + m.cost, 0);
  }

  getAverageTokenUsage(): { input: number; output: number } {
    const inputTokens = Object.values(this.metrics).map(m => m.inputTokens);
    const outputTokens = Object.values(this.metrics).map(m => m.outputTokens);
    return {
      input: inputTokens.reduce((sum, tokens) => sum + tokens, 0) / inputTokens.length,
      output: outputTokens.reduce((sum, tokens) => sum + tokens, 0) / outputTokens.length,
    };
  }

  getSuccessRate(): number {
    const totalTests = Object.keys(this.metrics).length;
    const successfulTests = Object.values(this.metrics).filter(m => 
      Object.values(m.evaluationResults).every(result => result)
    ).length;
    return (successfulTests / totalTests) * 100;
  }

  getMetricsSummary(): string {
    return `
Performance Metrics Summary:
----------------------------
Average Execution Time: ${this.getAverageExecutionTime().toFixed(2)} ms
Total Cost: $${this.getTotalCost().toFixed(6)}
Average Token Usage:
  - Input: ${this.getAverageTokenUsage().input.toFixed(2)}
  - Output: ${this.getAverageTokenUsage().output.toFixed(2)}
Success Rate: ${this.getSuccessRate().toFixed(2)}%
    `.trim();
  }
}