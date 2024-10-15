import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KUBERA_API, KUBERA_API_SIMPLE_MAIL } from '../common/constanst';

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
    return this.http.post<any>(this.simpleMailApiUrl, data);
  }
}
