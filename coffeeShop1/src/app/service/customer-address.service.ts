import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE,
  CUSTOMER_ACCOUNT_GRAPHQL_URL
} from '../common/constanst';

export interface CustomerAddress {
  id?: number;
  customer_details_id: number;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerAddressService {
  private apiUrl = CUSTOMER_ACCOUNT_GRAPHQL_URL;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE
    });
  }

  getAddressesByCustomerId(customerDetailsId: number): Observable<any> {
    const query = `
      query GetAddresses($id: Int!) {
        kubera_profile_customer_address(
          where: { customer_details_id: { _eq: $id } }
          order_by: [{ is_default: desc }, { id: desc }]
        ) {
          id
          customer_details_id
          full_name
          phone
          line1
          line2
          landmark
          city
          pincode
          lat
          lng
          is_default
          created_at
          updated_at
        }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { id: customerDetailsId } },
      { headers: this.headers() }
    );
  }

  insertAddress(address: CustomerAddress): Observable<any> {
    const query = `
      mutation InsertAddress($obj: kubera_profile_customer_address_insert_input!) {
        insert_kubera_profile_customer_address_one(object: $obj) {
          id
          lat
          lng
          is_default
          line1
        }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { obj: address } },
      { headers: this.headers() }
    );
  }

  updateAddress(id: number, set: Partial<CustomerAddress>): Observable<any> {
    const query = `
      mutation UpdateAddress($id: Int!, $set: kubera_profile_customer_address_set_input!) {
        update_kubera_profile_customer_address_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          lat
          lng
          is_default
        }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { id, set } },
      { headers: this.headers() }
    );
  }

  deleteAddress(id: number): Observable<any> {
    const query = `
      mutation DeleteAddress($id: Int!) {
        delete_kubera_profile_customer_address_by_pk(id: $id) {
          id
        }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { id } },
      { headers: this.headers() }
    );
  }

  /** Clear default on all addresses for customer, then optionally set one */
  clearDefaults(customerDetailsId: number): Observable<any> {
    const query = `
      mutation ClearDefaults($cid: Int!) {
        update_kubera_profile_customer_address(
          where: { customer_details_id: { _eq: $cid } }
          _set: { is_default: false }
        ) {
          affected_rows
        }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { cid: customerDetailsId } },
      { headers: this.headers() }
    );
  }
}
