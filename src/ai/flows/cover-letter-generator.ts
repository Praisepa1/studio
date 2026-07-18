'use server';
/**
 * @fileOverview Cover Letter Generator AI agent.
 *
 * - generateCoverLetter - A function that handles the cover letter generation process.
 * - GenerateCoverLetterInput - The input type for the generateCoverLetter function.
 * - GenerateCoverLetterOutput - The return type for the generateCoverLetter function.
 */

import { generateWithProvider, DEFAULT_AI_PROVIDER } from '@/ai/providers/index';
import { z } from 'zod';

const GenerateCoverLetterInputSchema = z.object({
  jobDescription: z.string().describe('The job description for which the cover letter is being written.'),
  userName: z.string().describe('The name of the user applying for the job.'),
  userSkills: z.string().describe('The skills of the user applying for the job.'),
  userExperience: z.string().describe('The experience of the user applying for the job.'),
});
export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterInputSchema>;

const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter.'),
});
export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;

export async function generateCoverLetter(input: GenerateCoverLetterInput, provider = DEFAULT_AI_PROVIDER): Promise<GenerateCoverLetterOutput> {
  const prompt = `You are an expert at writing cover letters. You will generate a cover letter for the user, based on the job description, user's skills, and user's experience.

Job Description: ${input.jobDescription}

User Name: ${input.userName}

User Skills: ${input.userSkills}

User Experience: ${input.userExperience}

Cover Letter:
`;

  const result = await generateWithProvider(provider, prompt);
  return { coverLetter: result.content };
}

