
import { ContactForm } from '@/components/contact-form';

// A simple WhatsApp icon component
const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto h-12 w-12 text-muted-foreground mb-4"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );


export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
            <WhatsAppIcon />
            <h1 className="text-4xl md:text-5xl font-headline tracking-tight">Contact Us</h1>
            <p className="mt-3 text-lg text-muted-foreground">
                Have a question or feedback? Send us a message on WhatsApp.
            </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
