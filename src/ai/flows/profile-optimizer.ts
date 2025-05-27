'use server';
/**
 * @fileOverview Profile optimization AI agent for Upwork and LinkedIn.
 *
 * - profileOptimizer - A function that handles the profile optimization process.
 * - ProfileOptimizerInput - The input type for the profileOptimizer function.
 * - ProfileOptimizerOutput - The return type for the profileOptimizer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfileOptimizerInputSchema = z.object({
  platform: z
    .enum(['Upwork', 'LinkedIn'])
    .describe('The platform for which to optimize the profile.'),
  profileText: z.string().describe('The current text of the profile.'),
  jobDescription: z.string().describe('The job description to optimize for.'),
});
export type ProfileOptimizerInput = z.infer<typeof ProfileOptimizerInputSchema>;

const ProfileOptimizerOutputSchema = z.object({
  optimizedProfile: z
    .string()
    .describe('The optimized profile text for the specified platform.'),
  suggestions: z.array(z.string()).describe('Specific suggestions for improving the profile.'),
});
export type ProfileOptimizerOutput = z.infer<typeof ProfileOptimizerOutputSchema>;

export async function profileOptimizer(input: ProfileOptimizerInput): Promise<ProfileOptimizerOutput> {
  return profileOptimizerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profileOptimizerPrompt',
  input: {schema: ProfileOptimizerInputSchema},
  output: {schema: ProfileOptimizerOutputSchema},
  prompt: `You are an expert profile optimizer for both Upwork and LinkedIn.  You will be provided
with the current profile text, and a job description.  You will respond with an updated profile and a list of specific suggestions.

Platform: {{{platform}}}
Profile: {{{profileText}}}
Job Description: {{{jobDescription}}} `,
});

const profileOptimizerFlow = ai.defineFlow(
  {
    name: 'profileOptimizerFlow',
    inputSchema: ProfileOptimizerInputSchema,
    outputSchema: ProfileOptimizerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
