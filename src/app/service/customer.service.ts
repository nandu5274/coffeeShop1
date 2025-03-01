import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { CUSTOMER_ACCOUNT_GRAPHQL_URL, CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE} from '../common/constanst';
import { gql } from 'graphql-tag';

@Injectable({
    providedIn: 'root',
  })
  export class CustomerService {

  constructor(private http: HttpClient) { }

  private apiUrl = CUSTOMER_ACCOUNT_GRAPHQL_URL;


  createCustomerDetails(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
mutation insert_kubera_profile_customer_details_one($kubera_profile_customer_details_insert_input:kubera_profile_customer_details_insert_input!) {
  insert_kubera_profile_customer_details_one(object:$kubera_profile_customer_details_insert_input) {
      created_at
      email_id
      id
      mobile_number
      name
      password
    
  }
}

  `;
  const body = {
    query: operationsDoc,
    variables: {
        kubera_profile_customer_details_insert_input: data
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }



  createCustomerDetailsWithPoints(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation insert_kubera_profile_customer_points_one($kubera_profile_customer_points_insert_input
    :kubera_profile_customer_points_insert_input!) {
      insert_kubera_profile_customer_points_one(object:$kubera_profile_customer_points_insert_input) {
        id
        customer_detail {
          id
          name
        }
      }
    }
    
  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_profile_customer_points_insert_input: data
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }




  getCustomerDetailsByNameAndPassword(name:any, password:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    query GetCustomerDeatils($username: String!) @cached {
  kubera_profile_customer_details(where: {name: {_eq: $username}}) {
    name
    password
    mobile_number
    id
    email_id
  }
}
  `;
  const body = {
    query: operationsDoc,
    variables: {
        username: name
        
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }

  updateCustomerDetailsByEmail(email_id:any, password:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `

    mutation update_kubera_profile_customer_details($email_id:String,$password:String) {
      update_kubera_profile_customer_details(where:{email_id: {_eq: $email_id}}, _set: {password: $password}) {
    affected_rows
    
      }
    }
  `;
  const body = {
    query: operationsDoc,
    variables: {
      email_id: email_id,
      password:password
        
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }


  createCustomerMemberShip(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    
mutation insert_kubera_profile_customer_member_ship_one( $kubera_profile_customer_member_ship_insert_input
:  kubera_profile_customer_member_ship_insert_input!) {
  insert_kubera_profile_customer_member_ship_one(object:$kubera_profile_customer_member_ship_insert_input) {
    id

  }
}

  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_profile_customer_member_ship_insert_input: data
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }



getCustomerMemberShipDetailsByNUmber(number:any): Observable<any> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
  });

  const operationsDoc = `
query kubera_profile_customer_member_ship($mobileNumber: String!) {
  kubera_profile_customer_member_ship(where: {customer_detail: {mobile_number: {_eq: $mobileNumber}}}) {
    validity_month
    member_ship_id
    expiry_date
    created_date
    customer_detail {
      name
      mobile_number
      email_id
    }
  }
}


`;
const body = {
  query: operationsDoc,
  variables: {
    mobileNumber: number
      
  }
};
  return this.http.post(this.apiUrl, body, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error:', error);

        // Check for 200 status code with error in response body
        if (error.status === 200 && error.error && error.error.errors) {
          const errors = error.error.errors;
          errors.forEach((graphqlError:any) => {
            console.error('GraphQL Error:', graphqlError.message);
            const errorMessage = graphqlError.message;

            // Handle specific errors, e.g., uniqueness violation
            if (errorMessage.includes('Uniqueness violation')) {
              alert('Email or Mobile Number already exists.');
            }
          });
        } else {
          console.error('Network Error:', error);
        }
        return throwError(() => error);
      })
    );

}
getCustomerDetailsWithPointsAndMemberShipByNumber(number:any): Observable<any> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
  });

  const operationsDoc = `
query kubera_profile_customer_details($mob: String!) {
  kubera_profile_customer_details(where: {mobile_number: {_eq: $mob}}) {
email_id
    id
    mobile_number
    name
    customer_points {
      id
      available_points
      customer_details_id
      total_points
    }
    customer_member_ship {
      id
      member_ship_id
      validity_month
      expiry_date
      customer_details_id
    }
  }
  
}


`;
const body = {
  query: operationsDoc,
  variables: {
    mob: number
      
  }
};
  return this.http.post(this.apiUrl, body, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error:', error);

        // Check for 200 status code with error in response body
        if (error.status === 200 && error.error && error.error.errors) {
          const errors = error.error.errors;
          errors.forEach((graphqlError:any) => {
            console.error('GraphQL Error:', graphqlError.message);
            const errorMessage = graphqlError.message;

            // Handle specific errors, e.g., uniqueness violation
            if (errorMessage.includes('Uniqueness violation')) {
              alert('Email or Mobile Number already exists.');
            }
          });
        } else {
          console.error('Network Error:', error);
        }
        return throwError(() => error);
      })
    );

}

  getCustomerPointAndDetailsByNumber(name:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
  query kubera_profile_customer_points($username: String!)  {
  kubera_profile_customer_points(where: {customer_detail: {_and: {mobile_number: {_eq: $username}}}}) {
available_points
    id
    total_points
    customer_detail {
      mobile_number
      name
      password
      email_id
      id
    }
  }
}

  `;
  const body = {
    query: operationsDoc,
    variables: {
        username: name
        
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }

  


  getCustomerDetailsByEmail(email_id:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
  query kubera_profile_customer_points($email_id: String!)  {
  kubera_profile_customer_points(where: {customer_detail: {_and: {email_id: {_eq: $email_id}}}}) {

    customer_detail {
      name
      id
    }
  }
}

  `;
  const body = {
    query: operationsDoc,
    variables: {
      email_id: email_id
        
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }

  
  getCustomerPointByName(name:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
query kubera_profile_customer_points($username: String!) {
  kubera_profile_customer_points(where: {customer_detail: {_and: {name: {_eq: $username}}}}) {
available_points

  }
}


  `;
  const body = {
    query: operationsDoc,
    variables: {
        username: name
        
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }


  createCustomerPointsHistory(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation insert_kubera_profile_customer_points_history_one($kubera_profile_customer_points_history_insert_input
    :kubera_profile_customer_points_history_insert_input!) {
      insert_kubera_profile_customer_points_history_one(object:$kubera_profile_customer_points_history_insert_input) {
        id
     
      }
    }
  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_profile_customer_points_history_insert_input: data
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }
  updateCustomerPoints(id:any, available_points:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation update_kubera_profile_customer_points($id:Int,$available_points:Int) {
      update_kubera_profile_customer_points(where: {id: {_eq: $id}}, _set: {available_points: $available_points}) {
    affected_rows
       returning {
      available_points
    }
      }
    }
    
  `;
  const body = {
    query: operationsDoc,
    variables: {
        id: id,
        available_points: available_points  
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }

  updateCustomerPointsAndDetails(id:any, available_points:any, total_points:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation update_kubera_profile_customer_points($id:Int,$available_points:Int,$total_points:Int) {
      update_kubera_profile_customer_points(where: {customer_details_id: {_eq: $id}}, _set: {available_points: $available_points, total_points: $total_points}) {
    affected_rows
       returning {
      available_points
    }
      }
    }
    
  `;
  const body = {
    query: operationsDoc,
    variables: {
        id: id,
        available_points: available_points,
        total_points: total_points  
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }
  updateCustomerPointsAndDetailsWithId(id:any, available_points:any, total_points:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation update_kubera_profile_customer_points($id:Int,$available_points:Int,$total_points:Int) {
      update_kubera_profile_customer_points(where: {id: {_eq: $id}}, _set: {available_points: $available_points, total_points: $total_points}) {
    affected_rows
       returning {
      available_points
    }
      }
    }
    
  `;
  const body = {
    query: operationsDoc,
    variables: {
        id: id,
        available_points: available_points,
        total_points: total_points  
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }



  createCustomerPaymentDetailsAndHistory(data:any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE // Replace with your authorization header
    });

    const operationsDoc = `
    mutation insert_kubera_profile_customer_payment_details_one( $kubera_profile_customer_payment_details_insert_input
    : kubera_profile_customer_payment_details_insert_input!) {
      insert_kubera_profile_customer_payment_details_one(object:$kubera_profile_customer_payment_details_insert_input) {
        id
    
      }
    }
    
  `;
  const body = {
    query: operationsDoc,
    variables: {
      kubera_profile_customer_payment_details_insert_input: data
    }
  };
    return this.http.post(this.apiUrl, body, { headers }).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error:', error);
  
          // Check for 200 status code with error in response body
          if (error.status === 200 && error.error && error.error.errors) {
            const errors = error.error.errors;
            errors.forEach((graphqlError:any) => {
              console.error('GraphQL Error:', graphqlError.message);
              const errorMessage = graphqlError.message;
  
              // Handle specific errors, e.g., uniqueness violation
              if (errorMessage.includes('Uniqueness violation')) {
                alert('Email or Mobile Number already exists.');
              }
            });
          } else {
            console.error('Network Error:', error);
          }
          return throwError(() => error);
        })
      );

  }
  }