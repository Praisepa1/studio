'use server';
// Define types and implement resume generation flow.

/**
 * @fileOverview Resume generator AI agent.
 *
 * - generateResume - A function that handles the resume generation process.
 * - GenerateResumeInput - The input type for the generateResume function.
 * - GenerateResumeOutput - The return type for the generateResume function.
 */

import { generateWithProvider, DEFAULT_AI_PROVIDER } from '@/ai/providers/index';
import { z } from 'zod';

const GenerateResumeInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The description of the job the resume is for.'),
  userDetails: z.string().describe('The details of the user.'),
});
export type GenerateResumeInput = z.infer<typeof GenerateResumeInputSchema>;

const GenerateResumeOutputSchema = z.object({
  resume: z.string().describe('The generated resume.'),
});
export type GenerateResumeOutput = z.infer<typeof GenerateResumeOutputSchema>;

export async function generateResume(input: GenerateResumeInput, provider = DEFAULT_AI_PROVIDER): Promise<GenerateResumeOutput> {
  const prompt = `You are an expert resume writer. You will generate a resume for the user based on the following job description and user details.

Job Description: ${input.jobDescription}
User Details: ${input.userDetails}

Resume:`;

  const result = await generateWithProvider(provider, prompt);
  return { resume: result.content };
}

