import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KUBERA_API, KUBERA_API_SIMPLE_MAIL, QSTASH_URL, QSTASH_TOKEN, QSTASH_DESTINATION_URL, PAYMENT_HASURA_ADMIN_SECRET } from '../common/constanst';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private apiUrl = KUBERA_API;
  private simpleMailApiUrl = KUBERA_API_SIMPLE_MAIL;
 // private apiUrl = 'http://localhost:8080/email/sendPaidOrder';

  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  postData(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  SendSimpleMail(data: any): Observable<any> {
    return this.http.post<any>('https://email-serverless-project.vercel.app/api/send-notification', data);
  }

  postToQStash(payload: any): Observable<any> {
    const publishUrl = `${QSTASH_URL}/v2/publish/${QSTASH_DESTINATION_URL}`;

    const headers = {
      'Authorization': `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-Content-Type': 'application/json',
      'Upstash-Forward-x-hasura-admin-secret': PAYMENT_HASURA_ADMIN_SECRET
    };

    return this.http.post<any>(publishUrl, payload, { headers });
  }
}
