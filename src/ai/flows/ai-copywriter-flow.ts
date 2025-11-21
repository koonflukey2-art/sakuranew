'use server';
/**
 * @fileOverview An AI agent that generates engaging and informative titles for UI sections.
 *
 * - generateUiTitles - A function that generates UI titles.
 * - UiTitlesInput - The input type for the generateUiTitles function.
 * - UiTitlesOutput - The return type for the generateUiTitles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UiTitlesInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  businessType: z.string().describe('The type of business.'),
  profitGoal: z.number().describe('The profit goal.'),
  fixedCosts: z.number().describe('The fixed costs.'),
});
export type UiTitlesInput = z.infer<typeof UiTitlesInputSchema>;

const UiTitlesOutputSchema = z.object({
  productInfoTitle: z.string().describe('Title for the Product Information section.'),
  costCalculationTitle: z.string().describe('Title for the Cost Calculation section.'),
  goalsAndResultsTitle: z.string().describe('Title for the Goals and Results section.'),
  advancedPlanningTitle: z.string().describe('Title for the Advanced Planning section.'),
});
export type UiTitlesOutput = z.infer<typeof UiTitlesOutputSchema>;

export async function generateUiTitles(input: UiTitlesInput): Promise<UiTitlesOutput> {
  return generateUiTitlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'uiTitlesPrompt',
  input: {schema: UiTitlesInputSchema},
  output: {schema: UiTitlesOutputSchema},
  prompt: `You are an AI copywriter specializing in UI titles.

  Generate engaging and informative titles for the following sections of a profit planning application. Make it short and easy to understand. Make them in English.

  Product Name: {{{productName}}}
  Business Type: {{{businessType}}}
  Profit Goal: {{{profitGoal}}}
  Fixed Costs: {{{fixedCosts}}}

  Sections:
  - Product Information
  - Cost Calculation
  - Goals and Results
  - Advanced Planning`,
});

const generateUiTitlesFlow = ai.defineFlow(
  {
    name: 'generateUiTitlesFlow',
    inputSchema: UiTitlesInputSchema,
    outputSchema: UiTitlesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
