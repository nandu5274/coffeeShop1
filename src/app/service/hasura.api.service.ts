import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KUBERA_ACCOUNT_GRAPHQL_API, KUBERA_ACCOUNT_GRAPHQL_KEY } from '../common/constanst';


@Injectable({
  providedIn: 'root',
})
export class HasuraApiService{
  private apiUrl = KUBERA_ACCOUNT_GRAPHQL_API;
 // private apiUrl = 'http://localhost:8080/email/sendPaidOrder';

  constructor(private http: HttpClient) {}

  getLatestVersion(): Observable<any> {
    const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
      });
    return this.http.get<any>(this.apiUrl,{ headers });
  }

}