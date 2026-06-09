export interface TestCase {
  id: string; // e.g., TC-001
  name: string; // scenario description or focus
  scenarioType: string; // Happy Path / Boundary Limit / Input Validation / Exception Flow
  testObjective: string; // What specific logic is targeted
  testSteps: string[]; // Sequential user actions / automation validation steps
  expectedOutput: string; // Precise expected result or verification check
}

export interface Attachment {
  name: string;
  mimeType: string;
  base64: string; // base64 encoded data
  size: number; // size in bytes
}

export interface GeneratedSuite {
  id: string; // Timestamp or random UID
  timestamp: string;
  description?: string; // Fallback or combined description
  userStory?: string;
  acceptanceCriteria?: string;
  requirementSpec?: string;
  customSpecs?: string;
  testObjective: string; // High-level consolidated strategy objective
  testCases: TestCase[]; // Meticulous validation checks
  attachments?: { name: string; size: number }[]; // Attachment metadata for history logs
}
