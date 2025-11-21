'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating n8n workflow configurations based on user settings.
 *
 * The flow takes user-defined settings and goals related to ad campaign automation
 * and generates a basic n8n workflow JSON configuration that includes a human-readable summary of the rules.
 *
 * @interface AutomationWorkflowGeneratorInput - Defines the input schema for the flow.
 * @interface AutomationWorkflowGeneratorOutput - Defines the output schema for the flow.
 * @function automationWorkflowGenerator - The main function to trigger the workflow generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomationWorkflowGeneratorInputSchema = z.object({
  workflowName: z.string().describe('The name of the n8n workflow.'),
  primaryGoal: z.string().describe('The primary goal of the workflow (e.g., scale revenue, reduce CPA).'),
  platforms: z.array(z.string()).describe('An array of platform names to integrate (e.g., facebook, google).'),
  features: z.array(z.string()).describe('An array of feature names to include in the workflow (e.g., budget optimization, creative refresh).'),
  rules: z.array(z.any()).describe('Array of automation rules.'),
});

export type AutomationWorkflowGeneratorInput = z.infer<typeof AutomationWorkflowGeneratorInputSchema>;

const AutomationWorkflowGeneratorOutputSchema = z.object({
  workflowJson: z.string().describe('The generated n8n workflow JSON configuration, including a human-readable summary of the rules.'),
});

export type AutomationWorkflowGeneratorOutput = z.infer<typeof AutomationWorkflowGeneratorOutputSchema>;

export async function automationWorkflowGenerator(input: AutomationWorkflowGeneratorInput): Promise<AutomationWorkflowGeneratorOutput> {
  return automationWorkflowGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automationWorkflowGeneratorPrompt',
  input: {schema: AutomationWorkflowGeneratorInputSchema},
  output: {schema: AutomationWorkflowGeneratorOutputSchema},
  prompt: `You are an AI workflow generator that outputs a JSON configuration for the n8n automation platform. You take high-level objectives and output functional code.

  Given the following specifications, generate a JSON configuration for an n8n workflow:

  Workflow Name: {{{workflowName}}}
  Primary Goal: {{{primaryGoal}}}
  Platforms: {{#each platforms}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Features: {{#each features}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  
  The core logic will be based on these human-readable rules. Translate them into the appropriate n8n node structure.
  Rules:
  {{#each rules}}
  - Rule {{@index}}: IF {{metric}} is {{operator}} {{value}} over the {{timeframe}}, THEN {{action}} {{#if actionValue}}by {{actionValue}}%{{/if}}.
  {{/each}}

  Ensure the output is a valid JSON configuration that can be directly imported into n8n. The JSON MUST be complete and valid.
  The JSON should contain nodes that check the conditions and execute the specified actions. Start with a "Schedule Trigger" node that runs daily.
  For each rule, create a corresponding "IF" node to check the condition. If the condition is true, it should lead to a node that performs the specified action (e.g., using an "HTTP Request" node to call the ad platform's API).
  Include a summary of the rules in a "Sticky Note" node within the n8n workflow for user reference.
  `,
});

const automationWorkflowGeneratorFlow = ai.defineFlow(
  {
    name: 'automationWorkflowGeneratorFlow',
    inputSchema: AutomationWorkflowGeneratorInputSchema,
    outputSchema: AutomationWorkflowGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {workflowJson: output!.workflowJson!};
  }
);
