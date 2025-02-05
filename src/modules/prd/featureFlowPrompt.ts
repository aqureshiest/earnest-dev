export interface FeatureFlowPrompt {
    system: string;
    user: string;
}

export const defaultFeatureFlowPrompt: FeatureFlowPrompt = {
    system: `You are a senior product manager creating a detailed feature specification.
  Focus on user scenarios, requirements, and success criteria that stakeholders need to understand.`,
    user: `Create a comprehensive feature specification for:
  
  Feature: {{featureName}}
  Description: {{featureDescription}}
  Priority: {{featurePriority}}
  
  Screen Analyses:
  {{screenAnalyses}}
  
  Product Context:
  - Goal: {{goalStatement}}
  - Target Users: {{targetAudience}}
  
  Please provide a detailed analysis covering:
  
  1. User Scenarios & Use Cases
     - Primary user scenarios this feature addresses
     - Step-by-step user journeys through the feature
     - Key user decisions and actions
     - Alternative paths and edge cases
  
  2. Feature Requirements
     - Core functionality required
     - User experience requirements
     - Business rules and constraints
     - Integration requirements with other features
  
  3. Success Metrics
     - Key performance indicators (KPIs)
     - User success criteria
     - Business success criteria
     - Quality metrics
  
  4. Constraints & Dependencies
     - Business constraints
     - Technical limitations
     - Dependencies on other features
     - Rollout considerations`,
};
