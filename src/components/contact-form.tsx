
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }).max(500, { message: 'Message must be less than 500 characters.' }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// A simple WhatsApp icon component
const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M16.75 13.96c.25.13.42.2.55.32.13.13.2.27.2.42s-.07.28-.2.42c-.13.15-.35.3-.65.45-.3.15-.7.22-1.15.22-.45 0-.9-.07-1.35-.22s-.85-.38-1.2-.68c-.35-.3-.65-.68-.9-1.12s-.38-.95-.38-1.52c0-.2.02-.38.07-.52s.1-.28.18-.4c.08-.12.18-.22.28-.3.1-.08.2-.13.32-.15.12-.02.25-.03.38-.03s.25.02.35.03c.1.02.2.03.28.05.08.02.15.05.2.08s.1.08.13.12c.03.04.05.1.07.15s.03.1.03.15c0 .1-.02.2-.05.28s-.08.15-.13.2c-.05.05-.1.1-.15.13s-.12.05-.18.05c-.05 0-.12-.02-.18-.03s-.12-.03-.18-.05-.12-.05-.15-.07-.05-.07-.05-.1c0-.05.02-.1.05-.13s.08-.05.13-.05c.05 0 .1 0 .15.02s.1.03.13.05c.03.02.07.05.1.08s.05.07.07.1c.02.03.03.07.03.1s-.02.1-.05.13c-.03.03-.07.07-.12.1-.05.03-.1.05-.18.07s-.15.03-.22.03c-.07 0-.15-.02-.2-.03s-.1-.03-.15-.05c-.05-.02-.08-.05-.12-.08s-.07-.07-.08-.12c-.02-.05-.02-.1-.02-.15s.02-.1.05-.15c.03-.05.08-.08.13-.12s.12-.05.18-.07.13-.03.2-.03c.1 0 .18.02.25.03s.13.05.18.08.08.08.12.12c.04.04.05.1.05.15s0 .12-.02.18c-.02.06-.05.12-.1.15s-.1.07-.15.1c-.05.03-.12.05-.2.05-.1 0-.2-.02-.3-.07s-.18-.1-.25-.18c-.07-.08-.13-.18-.18-.28s-.08-.2-.08-.3c0-.15.05-.28.13-.4s.18-.22.3-.28c.12-.06.25-.1.4-.13s.28-.05.42-.05.28.02.4.05.25.08.35.13c.1.05.2.12.28.2.08.08.13.18.15.28.02.1.03.2.03.3s-.02.2-.05.28c-.03.08-.08.15-.15.2s-.15.1-.22.12c-.08.02-.15.03-.22.03s-.12-.02-.18-.03-.1-.03-.12-.05c-.02-.02-.05-.03-.07-.05s-.03-.03-.03-.05c0-.02.02-.03.03-.05s.05-.03.07-.03.05 0 .07.02c.02.02.03.03.05.05s.03.03.05.05.03.05.05.07.02.05.03.07c.01.02.02.05.02.08s0 .07-.02.1c-.01.04-.03.07-.05.1s-.05.05-.07.07c-.02.02-.05.03-.08.05s-.07.02-.1.03c-.03.01-.07.02-.1.02s-.08.01-.1.01c-.13 0-.25-.02-.35-.05s-.2-.07-.28-.12c-.08-.05-.15-.1-.2-.17s-.1-.13-.12-.2c-.02-.07-.03-.13-.03-.2v-.15c0-.2.05-.38.15-.53s.22-.28.38-.38c.15-.1.32-.18.5-.22s.38-.07.58-.07c.2 0 .4.03.58.07s.35.12.5.22.28.23.38.38c.1.15.15.33.15.53v.15c0 .07-.01.13-.03.2z"></path>
    </svg>
);


export function ContactForm() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      message: '',
    },
  });

  function onSubmit(data: ContactFormValues) {
    // IMPORTANT: Replace this with your own WhatsApp number in international format.
    // For example: 233241234567 (for a number in Ghana)
    const whatsAppNumber = '233208535111';

    const message = `Hello, my name is ${data.name}. \n\n${data.message}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsAppNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us how we can help..." className="min-h-[120px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full gap-2" size="lg">
          <WhatsAppIcon />
          Send via WhatsApp
        </Button>
      </form>
    </Form>
  );
}
