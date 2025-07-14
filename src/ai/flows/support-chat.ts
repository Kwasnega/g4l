
'use server';
/**
 * @fileOverview A Genkit flow for a customer support chatbot.
 * - supportChat - A function that handles a user's support query.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SupportChatInputSchema, SupportChatOutputSchema, type SupportChatInput, type SupportChatOutput} from '@/types';


export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const historyForModel = input.history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }],
    }));

    const systemInstruction = `You are a friendly and helpful customer support agent for G4L (Greatness4L), a luxury streetwear brand from Ghana. Your personality is cool, modern, and helpful. Answer the user's questions about products, shipping, returns, and the brand. Keep your answers concise and friendly.
    
Key Information:
- Brand Colors: Black, Deep Red, Cream, with subtle Ghana green accents.
- Shipping: Only within Ghana, via Bolt or Yango.
- Payment: Pay on Delivery or Mobile Money.
- Returns: Contact support via the contact page.
- For specific order status, tell the user to check the "My Orders" page in their account.`;

    const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        // The 'system' parameter is not supported by this model. 
        // Instead, we prepend the instructions to the history.
        history: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: "Okay, I'm ready to help. What's your question?" }] },
          ...historyForModel,
        ],
        prompt: input.query,
        output: {
            schema: SupportChatOutputSchema
        }
    });

    return output ?? { response: "I'm sorry, I'm having trouble understanding. Could you ask in a different way?" };
  }
);
    
