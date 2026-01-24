import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  // 🔁 Replace with your Vercel project URL
  private readonly API_URL = 'https://email-serverless-project.vercel.app/api/send-mail';

  constructor(private http: HttpClient) {}

  /**
   * Sends PDF report via email
   */
 sendPdfReport(
  pdf: jsPDF,
  to: string,
  subjectPrefix: string,
  message: string
) {

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const fileName = `ck_${day}-${month}-${year}.pdf`;

  // ✅ Convert PDF → ArrayBuffer → Base64
  const pdfArrayBuffer = pdf.output('arraybuffer');

  const pdfBase64 = btoa(
    new Uint8Array(pdfArrayBuffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return this.http.post(this.API_URL, {
    to,
    subject: `${subjectPrefix} - ${day}-${month}-${year}`,
    message,
    pdfBase64,
    fileName
  });
}

}
