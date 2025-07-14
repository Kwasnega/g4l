
'use server';

import type { Order } from '@/types';
import sgMail from '@sendgrid/mail';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { storage, db } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, get, update } from "firebase/database";
import { format } from 'date-fns';

async function generateCertificate(order: Order): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Watermark
    page.drawText('G4L', {
        x: width / 2 - 120,
        y: height / 2 - 80,
        font: helveticaBold,
        size: 200,
        color: rgb(0.9, 0.9, 0.9),
        rotate: { type: 'degrees', angle: 45 },
        opacity: 0.5,
    });

    // G4L Logo (Text-based)
    page.drawText('G4L', {
        x: width / 2 - 36,
        y: height - 100,
        font: helveticaBold,
        size: 60,
        color: rgb(0, 0, 0),
    });

    // Title
    page.drawText('Certificate of Ownership', {
        x: 50,
        y: height - 160,
        font: helveticaBold,
        size: 30,
        color: rgb(0.1, 0.1, 0.1),
    });

    // User's Name
    page.drawText(order.name, {
        x: 50,
        y: height - 220,
        font: helveticaBold,
        size: 24,
    });

    // Order Details
    const orderIdText = `Order ID: #${order.id.substring(0, 8).toUpperCase()}`;
    const orderDateText = `Order Date: ${format(new Date(order.placedAt), 'MMMM d, yyyy')}`;
    page.drawText(`${orderIdText}\n${orderDateText}`, {
        x: 50,
        y: height - 260,
        font: helvetica,
        size: 12,
        lineHeight: 18,
        color: rgb(0.3, 0.3, 0.3),
    });
    
    // Purchased Items
    page.drawText('Products Purchased:', {
        x: 50,
        y: height - 320,
        font: helveticaBold,
        size: 14,
    });

    const productList = order.items.map(item => `- G4L ${item.productName}`).join('\n');
    page.drawText(productList, {
        x: 50,
        y: height - 345,
        font: helvetica,
        size: 12,
        lineHeight: 18,
    });

    // Tagline
    page.drawText('“You now own a piece of greatness.”', {
        x: 50,
        y: 150,
        font: helveticaBold,
        size: 18,
    });

    // Signature
    page.drawText('Verified by G4L Team', {
        x: 50,
        y: 80,
        font: helvetica,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}


export async function handleOrderConfirmation(orderData: Order) {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
    const adminEmail = process.env.ADMIN_EMAIL || 'greatness4lstore@gmail.com';

    let pdfBuffer: Buffer | null = null;
    let pdfAttachment;

    try {
        pdfBuffer = await generateCertificate(orderData);
    } catch (pdfError) {
        console.error(`Failed to generate PDF for order ${orderData.id}:`, pdfError);
        // Continue without PDF
    }
    
    if (pdfBuffer && storage) {
        const certificateRef = storageRef(storage, `certificates/${orderData.id}.pdf`);
        try {
            await uploadBytes(certificateRef, pdfBuffer, { contentType: 'application/pdf' });
            console.log(`Certificate for order ${orderData.id} uploaded successfully.`);
            
            pdfAttachment = {
                content: pdfBuffer.toString('base64'),
                filename: `G4L-Certificate-${orderData.id.substring(0,8)}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment',
            };

        } catch (storageError) {
            console.error(`Error uploading certificate to Firebase Storage for order ${orderData.id}:`, storageError);
            // Continue without PDF attachment if upload fails
        }
    }

    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee;">
        <div style="text-align: center; padding: 20px; background-color: #f4f4f4;">
          <h1 style="font-size: 48px; font-weight: bold; margin: 0; letter-spacing: 4px;">G4L</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="font-size: 24px;">Order Confirmed! 🔥</h2>
          <p>Hey ${orderData.name},</p>
          <p>Thank you for your order! Your greatness is officially on the way. We've received your order and are getting it ready for delivery.</p>
          
          <div style="border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Summary</h3>
            <p><strong>Order ID:</strong> #${orderData.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Order Date:</strong> ${format(new Date(orderData.placedAt), 'MMMM d, yyyy, h:mm a')}</p>
            ${orderData.paystackReference ? `<p><strong>Payment Reference:</strong> ${orderData.paystackReference}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              ${orderData.items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">
                    <strong>G4L ${item.productName}</strong><br>
                    <span style="font-size: 12px; color: #777;">Qty: ${item.quantity} | Size: ${item.size}</span>
                  </td>
                  <td style="padding: 10px 0; text-align: right;">GH₵${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
            <p style="text-align: right; margin: 15px 0 0; font-size: 18px;"><strong>Total: GH₵${orderData.total.toFixed(2)}</strong></p>
          </div>
          
          <p>We'll be sending it via ${orderData.deliveryMethod} rider to your address: ${orderData.address}.</p>
          <p>${pdfAttachment ? 'Your official Certificate of Ownership is attached to this email.' : 'Your Certificate of Ownership will be created and sent to you in a separate email shortly.'}</p>
          
          <p style="margin-top: 30px;">Stay Great,</p>
          <p><strong>The G4L Team</strong></p>
        </div>
        <div style="text-align: center; padding: 20px; background-color: #f4f4f4; font-size: 12px; color: #777;">
          <p>© ${new Date().getFullYear()} GREATNESS4L. All rights reserved.</p>
        </div>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
        <h2>🚨 New G4L Order Received</h2>
        <p><strong>Customer:</strong> ${orderData.name} (${orderData.email})</p>
        <p><strong>Phone:</strong> ${orderData.phone}</p>
        <p><strong>Delivery Address:</strong> ${orderData.address}</p>
        <p><strong>Delivery Method:</strong> ${orderData.deliveryMethod}</p>
        ${orderData.paystackReference ? `<p><strong>Paystack Ref:</strong> ${orderData.paystackReference}</p>` : ''}
        
        <h3 style="margin-top: 20px;">Order Details (ID: #${orderData.id.substring(0, 8).toUpperCase()})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border-bottom: 2px solid #ddd; padding: 8px; text-align: left;">Product</th>
              <th style="border-bottom: 2px solid #ddd; padding: 8px; text-align: center;">Qty</th>
              <th style="border-bottom: 2px solid #ddd; padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items.map(item => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">G4L ${item.productName} <br><small style="color: #666;">Size: ${item.size}, Color: ${item.color}</small></td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">GH₵${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; text-align: right; border-top: 2px solid #ddd;"><strong>Total:</strong></td>
              <td style="padding: 8px; text-align: right; border-top: 2px solid #ddd;"><strong>GH₵${orderData.total.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <p style="margin-top: 20px;">Time to get to work! 🚀</p>
      </div>
    `;

    if (sendgridApiKey && sendgridFromEmail) {
        sgMail.setApiKey(sendgridApiKey);
        
        const userMsg = { 
            to: orderData.email, 
            from: { name: 'G4L Streetwear', email: sendgridFromEmail }, 
            subject: `Order Confirmed: Your G4L Gear is on the Way! (#${orderData.id.substring(0, 8).toUpperCase()})`, 
            html: userEmailHtml,
            attachments: pdfAttachment ? [pdfAttachment] : [],
        };
        const adminMsg = { to: adminEmail, from: { name: 'G4L Store', email: sendgridFromEmail }, subject: `🚨 New G4L Order Received (#${orderData.id.substring(0,8).toUpperCase()})`, html: adminEmailHtml };

        try {
            await Promise.all([sgMail.send(userMsg), sgMail.send(adminMsg)]);
        } catch (emailError) {
            console.error('Error sending email with SendGrid:', emailError);
        }
    } else {
        console.warn('SendGrid is not configured. Falling back to console logging emails.');
        console.log('--- SIMULATING EMAIL TO USER ---', { to: orderData.email, html: userEmailHtml });
        console.log('--- SIMULATING EMAIL TO ADMIN ---', { to: adminEmail, html: adminEmailHtml });
    }
}

export async function getCertificateUrl(orderId: string): Promise<string | null> {
    if (!storage) {
        console.log('Firebase Storage is not configured. Cannot fetch certificate URL.');
        return null;
    }
    try {
        const certificateRef = storageRef(storage, `certificates/${orderId}.pdf`);
        const url = await getDownloadURL(certificateRef);
        return url;
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            // This is an expected error during polling, so we don't log it as an error.
            // Returning null signals that polling should continue.
        } else {
            console.error(`Error fetching certificate URL for order ${orderId}:`, error);
        }
        return null;
    }
}


export async function sendContactMessage(data: { name: string; email: string; message: string; }) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL || 'greatness4lstore@gmail.com';

  if (!sendgridApiKey || !sendgridFromEmail) {
    console.warn('SendGrid environment variables are not configured. Cannot send contact message.');
    console.log('--- SIMULATING CONTACT EMAIL ---', { from: `${data.name} <${data.email}>`, to: adminEmail, message: data.message });
    return { success: true };
  }
  
  sgMail.setApiKey(sendgridApiKey);

  const msg = {
    to: adminEmail,
    from: sendgridFromEmail,
    replyTo: data.email,
    subject: `New G4L Contact Form Message from ${data.name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Error sending contact email with SendGrid:', error);
    return { success: false, error: 'Failed to send message.' };
  }
}

// Paystack Integration
export async function initializePaystackTransaction(email: string, amount: number, callback_url: string) {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
        console.error('Paystack secret key is not configured in .env file.');
        return { success: false, error: 'Payment gateway is currently unavailable. Please contact support.' };
    }

    const params = {
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in the lowest currency unit (kobo)
        callback_url,
    };

    try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!data.status) {
            throw new Error(data.message || 'Failed to initialize Paystack transaction.');
        }

        return {
            success: true,
            url: data.data.authorization_url as string,
            reference: data.data.reference as string,
        };
    } catch (error) {
        console.error('Paystack initialization error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
}

export async function verifyPaystackTransaction(reference: string) {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Paystack secret key is not configured.');
    }

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        });

        const data = await response.json();

        if (data.status && data.data.status === 'success') {
            return { success: true, data: data.data };
        } else {
            return { success: false, error: data.data?.gateway_response || 'Transaction verification failed.' };
        }
    } catch (error) {
        console.error('Paystack verification error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
}

export async function getCloudinarySignature() {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary configuration is missing.");
    }
    
    const timestamp = Math.round((new Date).getTime()/1000);

    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
    
    const signature = cloudinary.utils.api_sign_request({ timestamp }, apiSecret);

    return { timestamp, signature, apiKey, cloudName };
}
