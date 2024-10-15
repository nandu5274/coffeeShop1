import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { gql } from 'graphql-tag';
import { ResponseDto } from '../dtos/responseDto';
import { SharedService } from './shared-service';
import { Observable } from 'rxjs';
import { GRAPHQL_KEY } from '../common/constanst';

@Injectable({
  providedIn: 'root',
})
export class GraphqlService {
  constructor(private apollo: Apollo, private sharedService:SharedService) {}

  responseDto: ResponseDto = new ResponseDto; 

  
  // Method to save data to both tables and associate them
  saveDataAndLink(kubera_order_insert_input: any): any {
    return this.apollo.mutate({
      mutation: gql`
      mutation SaveOderWithItems($kubera_order_insert_input: kubera_order_insert_input!) {
        insert_kubera_order_one(object: $kubera_order_insert_input) {
          id
          order_status
          order_ref_id
          order_summary_amount
          order_additional_service_amount
          order_total_amount
          table_no
          table_place
          order_items {
            item_name
            item_description
            item_cost
            item_quantity
            order_ref_id
            status
          }
        }
      }
      
      `,
      variables: {
       
        kubera_order_insert_input
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    }) .subscribe(
      ( data:any ) => {
        this.responseDto.status = 'success'
        this.responseDto.data = data
        // Handle the response here
        this.sharedService.setOrderProcessingResponse( this.responseDto);
        console.log(data);
      },
      (error) => {
       
        this.responseDto.status = 'error'
        this.sharedService.setOrderProcessingResponse( this.responseDto);
        console.error('Mutation error:', error);
      }
    );
  }


   
  // Method to save data to both tables and associate them
  getOrderItemDetails(orderIds: number[]): any {
    return this.apollo.query({
      query: gql`
      query GetOrderDetails($orderIds: [Int!]!) {
        kubera_order_item(where: { id: { _in: $orderIds } }) {
          id
    item_name
    item_quantity
    order_id
    status
    order {
      id
      table_no
      table_place
    }
    created_at
        }
      }
      
      `,
      variables: {
        orderId: orderIds, // replace 'id' with the actual field you want to query
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    })
    .subscribe(
      (data: any) => {
        this.responseDto.status = 'success';
        this.responseDto.data = data;
        // Handle the response here
        this.sharedService.setOrderProcessingResponse(this.responseDto);
        console.log(data);
      },
      (error) => {
        this.responseDto.status = 'error';
        this.sharedService.setOrderProcessingResponse(this.responseDto);
        console.error('Query error:', error);
      }
    );
  }

  getOrderItems(orderIds: any): Observable<any> {
    const query = gql`
    query GetOrderItems($orderIds: [Int!]!) @cached {
      kubera_order_item(order_by: {created_at: desc}, where: { order_id: { _in: $orderIds } }) {
          id
          item_name
          item_quantity
          order_id
          status
          order {
            id
            table_no
            table_place
          }
          created_at
        }
      }
    `;

    return this.apollo.query({
      query,
      variables: {
        orderIds,
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getOrderItemsByOrderID(orderIds: any): Observable<any> {
    const query = gql`
    query GetOrderItems($orderIds: [Int!]!) {
      kubera_order(order_by: {created_at: desc}, where: { id: { _in: $orderIds } }) {
        id
        order_items {
          id
          item_name
          item_quantity
          status
          created_at
          order_id
        }
        table_no
        table_place
        created_at
        order_status
        employee
      }
      }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only', 
      variables: {
        orderIds,
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }



  updateOrderItem(itemId: any, status: any): any {
    const mutation = gql`
      mutation UpdateKuberaOrderItem($itemId: Int!, $status: String!) {
        update_kubera_order_item(
          where: { id: { _eq: $itemId } }
          _set: { status: $status }
        ) {
          returning {
            created_at
            id
            item_cost
            item_description
            item_name
            item_quantity
            status
            order_id
          }
        }
      }
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        itemId,
        status,
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }
  


  updateOrderStatus(itemId: any, order_status: any): any {
    const mutation = gql`
      mutation update_kubera_order($itemId: Int!, $order_status: String!) {
        update_kubera_order(
          where: { id: { _eq: $itemId } }
          _set: { order_status: $order_status }
        ) {
          returning {
            created_at
            id
            order_status
          }
        }
      }
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        itemId,
        order_status,
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }




  createEmployeeLogin(kubera_employee_login_insert_input:any): any {
    const mutation = gql`
   mutation InsertEmployeeLogin($kubera_employee_login_insert_input: kubera_employee_login_insert_input!) {
  insert_kubera_employee_login_one(object: $kubera_employee_login_insert_input) {
    expire_in
    id
    password
    user_name
    created_at
    renew_date
    updated_at
  }
}
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        kubera_employee_login_insert_input
        
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getEmployeeLoginDetailsByUserName(user_name:any): any {
    const mutation = gql`
 query GetEmployeeLogin ($user_name: String!){
  kubera_employee_login(where: {user_name: {_eq: $user_name }}) {
    id
    user_name
    password
    renew_date
    created_at
    updated_at
    expire_in
  }
}

    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        user_name
        
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }
  
  updateEmployeeRenewDetailsByUserName(user_name:any, renew_date:any): any {
    const mutation = gql`
mutation update_kubera_employee_login($user_name: String!, $renew_date: timestamptz!) {
  update_kubera_employee_login(where: {user_name: {_eq: $user_name}}, _set: {renew_date: $renew_date}) {
    returning {
      user_name,
      renew_date
    }
  }
}



    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        user_name,
        renew_date
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }
  

}