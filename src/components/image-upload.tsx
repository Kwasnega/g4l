
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getCloudinarySignature } from '@/lib/actions';

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  uploadPreset: string;
}

export function ImageUpload({ value, onChange, uploadPreset }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
        const { timestamp, signature, apiKey, cloudName } = await getCloudinarySignature();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('api_key', apiKey);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Image upload failed.');
        }

        const data = await response.json();
        onChange([...value, data.secure_url]);

    } catch (error) {
      console.error('Upload Error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Could not upload image.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onRemove = (url: string) => {
    onChange(value.filter((current) => current !== url));
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {value.map((url) => (
          <div
            key={url}
            className="relative w-[200px] h-[200px] rounded-md overflow-hidden"
          >
            <div className="z-10 absolute top-2 right-2">
              <Button
                type="button"
                onClick={() => onRemove(url)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Image fill className="object-cover" alt="Image" src={url} />
          </div>
        ))}
        {isUploading && (
            <div className="w-[200px] h-[200px] rounded-md flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )}
      </div>
      <div>
        <input 
            type="file" 
            id="image-upload"
            className="sr-only"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
        />
        <label htmlFor="image-upload">
            <Button type="button" variant="secondary" asChild disabled={isUploading}>
                <span className="cursor-pointer">
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Upload an Image
                </span>
            </Button>
        </label>
      </div>
    </div>
  );
}
