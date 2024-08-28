export class ResponseEvaluator {
  evaluate(response: any, expectedOutput: any, evaluationCriteria: { [key: string]: (response: any) => boolean }): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};

    for (const [criteriaName, criteriaFunction] of Object.entries(evaluationCriteria)) {
      try {
        results[criteriaName] = criteriaFunction(response);
      } catch (error) {
        console.error(`Error evaluating criteria ${criteriaName}:`, error);
        results[criteriaName] = false;
      }
    }

    return results;
  }

  static contentRelevance(response: any, expectedKeywords: string[]): boolean {
    const responseString = JSON.stringify(response).toLowerCase();
    return expectedKeywords.every(keyword => responseString.includes(keyword.toLowerCase()));
  }

  static formatValidation(response: any, expectedFormat: any): boolean {
    const checkFormat = (obj: any, format: any): boolean => {
      if (typeof obj !== typeof format) return false;
      if (Array.isArray(format)) {
        return Array.isArray(obj) && obj.every(item => checkFormat(item, format[0]));
      }
      if (typeof format === 'object') {
        return Object.keys(format).every(key => checkFormat(obj[key], format[key]));
      }
      return true;
    };

    return checkFormat(response, expectedFormat);
  }

  static completeness(response: any, requiredFields: string[]): boolean {
    const checkFields = (obj: any, fields: string[]): boolean => {
      return fields.every(field => {
        const parts = field.split('.');
        let value = obj;
        for (const part of parts) {
          if (value === undefined || value === null) return false;
          value = value[part];
        }
        return value !== undefined && value !== null;
      });
    };

    return checkFields(response, requiredFields);
  }
}