'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting clothing combinations
 * based on the products a user has viewed on the G4L Streetwear Showcase.
 *
 * - suggestDripCombos - A function that suggests clothing combinations based on viewed products.
 */

import {ai} from '@/ai/genkit';
import {
  type SuggestDripCombosInput,
  type SuggestDripCombosOutput,
  SuggestDripCombosInputSchema,
  SuggestDripCombosOutputSchema,
} from '@/types';

export async function suggestDripCombos(input: SuggestDripCombosInput): Promise<SuggestDripCombosOutput> {
  return suggestDripCombosFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDripCombosPrompt',
  input: {schema: SuggestDripCombosInputSchema},
  output: {schema: SuggestDripCombosOutputSchema},
  prompt: `You are a personal stylist for G4L (Greatness4L), a luxury streetwear brand from Ghana. A user has been browsing the following products:

{{#each viewedProducts}}
- {{name}} (Price: {{price}}, Sizes: {{sizes}}, Rating: {{rating}})
{{/each}}

Based on these viewed products, suggest three distinct clothing combinations that the user might like. Each combination should be a string describing the outfit. Focus on combinations that reflect the G4L brand aesthetic: Black, Deep Red, Cream, with subtle Ghana green accents.

Ensure the suggestions are creative and stylish, and take into account the details of the viewed products to create cohesive and appealing outfits.`,
});

const suggestDripCombosFlow = ai.defineFlow(
  {
    name: 'suggestDripCombosFlow',
    inputSchema: SuggestDripCombosInputSchema,
    outputSchema: SuggestDripCombosOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
