
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Bot, Loader2, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { supportChat } from '@/ai/flows/support-chat';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // The history sent to the AI should not include the latest user message
      const history = [...messages];
      const result = await supportChat({ 
          query: currentInput,
          history: history 
      });
      const modelMessage: Message = { role: 'model', content: result.response };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      const errorMessage: Message = { role: 'model', content: 'Sorry, something went wrong. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-20 right-4 z-50 rounded-full h-12 w-12 shadow-lg"
          aria-label="G4L Oracle"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot /> G4L Oracle
          </SheetTitle>
          <SheetDescription>
            Seek wisdom about style, products, or orders.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0">
            <ScrollArea className="h-full -mx-6" viewportRef={scrollViewportRef}>
            <div className="py-4 px-6 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                        <Bot className="h-10 w-10 mb-2" />
                        <p>Welcome to the G4L Oracle.</p>
                        <p className="text-sm">How can I assist you?</p>
                    </div>
                )}
                {messages.map((message, index) => (
                <div
                    key={index}
                    className={cn(
                    "flex items-start gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                >
                    {message.role === 'model' && (
                    <Avatar className="h-8 w-8 bg-muted border">
                        <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                    )}
                    <div
                    className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%] text-sm break-words",
                        message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                    >
                    <p>{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                        <Avatar className="h-8 w-8 bg-muted border">
                            <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                    )}
                </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8 bg-muted border">
                            <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>
            </ScrollArea>
        </div>
        <SheetFooter className="mt-auto pt-4">
            <form onSubmit={handleSend} className="flex w-full items-center space-x-2">
                <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                </Button>
            </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
