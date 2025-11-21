'use server';
/**
 * @fileOverview Provides personalized recommendations and insights on how to improve profit metrics and business strategies.
 *
 * - getMetricsAdvice - A function that provides metrics advice based on input data.
 * - MetricsAdviceInput - The input type for the getMetricsAdvice function.
 * - MetricsAdviceOutput - The return type for the getMetricsAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MetricsAdviceInputSchema = z.object({
  businessType: z
    .string()
    .describe('The type of business, e.g., ecommerce, SaaS, etc.'),
  profitGoal: z.number().describe('The desired profit goal.'),
  fixedCosts: z.number().describe('The fixed costs of the business.'),
  sellingPrice: z.number().describe('The selling price of the product.'),
  cogs: z.number().describe('The cost of goods sold.'),
  targetRoas: z.number().describe('The target return on ad spend.'),
  targetCpa: z.number().describe('The target cost per acquisition.'),
  funnelPlan: z.string().describe('The marketing funnel plan being used.'),
  metricsPlan: z.string().describe('The chosen metrics plan.'),
});
export type MetricsAdviceInput = z.infer<typeof MetricsAdviceInputSchema>;

const MetricsAdviceOutputSchema = z.object({
  recommendations: z
    .string()
    .describe('Personalized recommendations to improve profit metrics.'),
  insights: z
    .string()
    .describe('Actionable insights for enhancing business strategies.'),
});
export type MetricsAdviceOutput = z.infer<typeof MetricsAdviceOutputSchema>;

export async function getMetricsAdvice(input: MetricsAdviceInput): Promise<MetricsAdviceOutput> {
  return metricsAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'metricsAdvicePrompt',
  input: {schema: MetricsAdviceInputSchema},
  output: {schema: MetricsAdviceOutputSchema},
  prompt: `You are an expert business advisor specializing in profit metrics and business strategies.

  Based on the following business information, provide personalized recommendations and actionable insights to improve their profit metrics and overall business strategies.

  Business Type: {{{businessType}}}
  Profit Goal: {{{profitGoal}}}
  Fixed Costs: {{{fixedCosts}}}
  Selling Price: {{{sellingPrice}}}
  COGS: {{{cogs}}}
  Target ROAS: {{{targetRoas}}}
  Target CPA: {{{targetCpa}}}
  Funnel Plan: {{{funnelPlan}}}
  Metrics Plan: {{{metricsPlan}}}

  Provide clear, concise, and actionable recommendations and insights.
  Format the output as follows:
  Recommendations: [list of recommendations]
  Insights: [list of insights]`,
});

const metricsAdviceFlow = ai.defineFlow(
  {
    name: 'metricsAdviceFlow',
    inputSchema: MetricsAdviceInputSchema,
    outputSchema: MetricsAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
