// use server'

/**
 * @fileOverview This file defines a Genkit flow for generating smart search filter suggestions
 * based on AI analysis of job descriptions.
 *
 * - smartSearchFlow - A function that generates search filter suggestions.
 * - SmartSearchInput - The input type for the smartSearchFlow function.
 * - SmartSearchOutput - The return type for the smartSearchFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartSearchInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to analyze for search filter suggestions.'),
});

export type SmartSearchInput = z.infer<typeof SmartSearchInputSchema>;

const SmartSearchOutputSchema = z.object({
  searchFilters: z
    .array(z.string())
    .describe('An array of suggested search filters based on the job description.'),
});

export type SmartSearchOutput = z.infer<typeof SmartSearchOutputSchema>;

export async function smartSearch(input: SmartSearchInput): Promise<SmartSearchOutput> {
  return smartSearchFlow(input);
}

const smartSearchPrompt = ai.definePrompt({
  name: 'smartSearchPrompt',
  input: {schema: SmartSearchInputSchema},
  output: {schema: SmartSearchOutputSchema},
  prompt: `You are an AI job search assistant. Analyze the following job description and suggest relevant search filters to help the user find similar jobs.

Job Description: {{{jobDescription}}}

Suggest search filters as an array of strings.`,
});

const smartSearchFlow = ai.defineFlow(
  {
    name: 'smartSearchFlow',
    inputSchema: SmartSearchInputSchema,
    outputSchema: SmartSearchOutputSchema,
  },
  async input => {
    const {output} = await smartSearchPrompt(input);
    return output!;
  }
);
