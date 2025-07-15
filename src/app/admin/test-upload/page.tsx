"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRODUCT_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET;

export default function TestUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const { toast } = useToast();

  const testUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRODUCT_UPLOAD_PRESET || '');

    try {
      console.log('Testing Cloudinary upload with:', {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_PRODUCT_UPLOAD_PRESET,
        fileName: file.name,
        fileSize: file.size
      });

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || `Upload failed with status ${response.status}`);
      }

      setUploadedUrl(data.secure_url);
      toast({
        title: "Upload Successful!",
        description: "Image uploaded to Cloudinary successfully.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Cloudinary Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>Cloud Name:</strong> {CLOUDINARY_CLOUD_NAME || 'Not set'}</p>
            <p><strong>Upload Preset:</strong> {CLOUDINARY_PRODUCT_UPLOAD_PRESET || 'Not set'}</p>
          </div>
          
          <Input
            type="file"
            accept="image/*"
            onChange={testUpload}
            disabled={uploading}
          />
          
          {uploading && (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
          
          {uploadedUrl && (
            <div>
              <p className="text-green-600">Upload successful!</p>
              <img src={uploadedUrl} alt="Uploaded" className="max-w-full h-auto mt-2" />
              <p className="text-xs break-all mt-2">{uploadedUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
