import { Injectable } from '@angular/core';
import Tesseract from 'tesseract.js';

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  extractTextFromImage(image: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onload = () => {
        Tesseract.recognize(reader.result as string, 'eng')
          .then(({ data: { text } }) => resolve(text))
          .catch(error => reject(error));
      };
      reader.onerror = (error) => reject(error);
    });
  }
}
