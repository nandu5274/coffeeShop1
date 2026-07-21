import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KUBERA_ACCOUNT_GRAPHQL_API, KUBERA_ACCOUNT_GRAPHQL_GET_CONFIG_API, KUBERA_ACCOUNT_GRAPHQL_GET_CONFIG_BY_TYPE_API, KUBERA_ACCOUNT_GRAPHQL_KEY, KUBERA_ACCOUNT_GRAPHQL_QUERY_API, KUBERA_ACCOUNT_GRAPHQL_UPDATE_CONFIG_BY_TYPE_API, DAILY_SALES_REPORT_API, PAYMENT_HASURA_ADMIN_SECRET } from '../common/constanst';
import { gql } from 'graphql-tag';

@Injectable({
  providedIn: 'root',
})
export class HasuraApiService {
  private apiUrl = KUBERA_ACCOUNT_GRAPHQL_API;
  private getConfigUrl = KUBERA_ACCOUNT_GRAPHQL_GET_CONFIG_API;
  private getConfigUrlByType = KUBERA_ACCOUNT_GRAPHQL_GET_CONFIG_BY_TYPE_API;
  private updateConfigByTypeUrl = KUBERA_ACCOUNT_GRAPHQL_UPDATE_CONFIG_BY_TYPE_API;

  private graphqlApiUrl = KUBERA_ACCOUNT_GRAPHQL_QUERY_API;
  // private apiUrl = 'http://localhost:8080/email/sendPaidOrder';

  constructor(private http: HttpClient) { }

  getLatestVersion(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });
    return this.http.get<any>(this.apiUrl, { headers });
  }

  getKuberaAccountPaymentDetails(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });

    const operationsDoc = `
    query MyQuery {
      kubera_Account_kubera_payments(limit: 20, order_by: {id: desc}) {
        amount
        amount_paid
        attachmnet
        balance
        company_name
        created_at
        generated_date
        id
        invoice_number
        paid_by
        payment_date
        payment_type
        status
        updated_at
        use_month
        use_year
      }
    }
  `;
  const body = {
    query: operationsDoc,
  };
    return this.http.post(this.graphqlApiUrl, body, { headers });

  }


  setKuberaAccountPaymentDetails(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });

    const operationsDoc = `
  mutation insert_kubera_Account_kubera_payments_one($kubera_Account_kubera_payments_insert_input:kubera_Account_kubera_payments_insert_input!) {
  insert_kubera_Account_kubera_payments_one(object: $kubera_Account_kubera_payments_insert_input) {
        amount
        amount_paid
        attachmnet
        balance
        company_name
        created_at
        generated_date
        id
        invoice_number
        paid_by
        payment_date
        payment_type
        status
        updated_at
        use_month
        use_year
  }
}
  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_Account_kubera_payments_insert_input: data
    }
  };
    return this.http.post(this.graphqlApiUrl, body, { headers });

  }


  setKuberaAccountAdminPaymentDetails(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });

    const operationsDoc = `
  mutation insert_kubera_Account_kubera_admin_payment_one($kubera_Account_kubera_admin_payment_insert_input:kubera_Account_kubera_admin_payment_insert_input!) {
  insert_kubera_Account_kubera_admin_payment_one(object: $kubera_Account_kubera_admin_payment_insert_input) {
      amount
      company_name
      created_at
      id
      month
      payment_date
      year
  }
}
  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_Account_kubera_admin_payment_insert_input: data
    }
  };
    return this.http.post(this.graphqlApiUrl, body, { headers });

  }


  getConfigDetails(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });
    return this.http.get<any>(this.getConfigUrl, { headers });
  }


  getConfigDetailsByType(type:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });
    return this.http.get<any>(this.getConfigUrlByType + type, { headers });
  }
  
  updateConfigByType(type:any, status:any)
  {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });
    return this.http.get<any>(this.updateConfigByTypeUrl+ type + "/"+ status, { headers });
  }



  getKuberaAccountAdminPaymentDetails(month:any, year:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY // Replace with your authorization header
    });

    const operationsDoc = `
    query kubera_Account_kubera_admin_payment($month: String!, $year: String!)  {
  kubera_Account_kubera_admin_payment_aggregate(order_by: {id: desc}, where: {month: {_eq: $month}, year: {_eq: $year}}) {
    aggregate {
      sum {
        amount
      }
    }
    nodes {
      amount
      company_name
      created_at
      id
      month
      payment_date
      year
      payment_type
    }
  }
}

  `;
  const body = {
    query: operationsDoc,
    variables: {
      month: month,
      year:year
    }
  };
    return this.http.post(this.graphqlApiUrl, body, { headers });

  }

  insertDailySalesReport(data: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': PAYMENT_HASURA_ADMIN_SECRET
    });
    const body = {
      reportData: [data]
    };
    return this.http.post<any>(DAILY_SALES_REPORT_API, body, { headers });
  }

  getPaymentDetailsFromAlive(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': PAYMENT_HASURA_ADMIN_SECRET
    });
    const body = {
      query: `
        query {
          payment_details(order_by: {created_at: desc}) {
            id
            actual_amount
            paid_amount
            payment_mode
            created_at
            created_time
            bill_no
            order_id
          }
        }
      `
    };
    return this.http.post<any>('https://alive-bedbug-11.hasura.app/v1/graphql', body, { headers });
  }

  getOrdersFromAlive(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': PAYMENT_HASURA_ADMIN_SECRET
    });
    const body = {
      query: `
        query {
          order(order_by: {created_at: desc}) {
            id
            order_ref_id
            order_status
            table_no
            created_at
          }
          order_item(order_by: {created_at: desc}) {
            id
            item_name
            item_quantity
            item_description
            created_at
            order_ref_id
            order_id
          }
        }
      `
    };
    return this.http.post<any>('https://alive-bedbug-11.hasura.app/v1/graphql', body, { headers });
  }

}