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
          comments
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

  getApprovalWaitingOrders(): Observable<any> {
    const query = gql`
    query GetApprovalWaitingOrders {
      kubera_order(order_by: {created_at: desc}, where: { order_status: { _eq: "approval_waiting" } }) {
        id
        order_ref_id
        table_no
        table_place
        order_summary_amount
        order_additional_service_amount
        order_total_amount
        order_status
        employee
        comments
        customer_number
        created_at
        order_items {
          id
          item_name
          item_quantity
          item_cost
          item_description
          status
          created_at
          order_id
        }
      }
    }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getApprovedOrders(): Observable<any> {
    const query = gql`
    query GetApprovedOrders {
      kubera_order(order_by: {created_at: desc}, where: { order_status: { _eq: "Approved" } }) {
        id
        order_ref_id
        table_no
        table_place
        order_summary_amount
        order_additional_service_amount
        order_total_amount
        order_status
        employee
        comments
        customer_number
        created_at
        order_items {
          id
          item_name
          item_quantity
          item_cost
          item_description
          status
          created_at
          order_id
        }
      }
    }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getCheckoutOrders(): Observable<any> {
    const query = gql`
    query GetCheckoutOrders {
      kubera_order(order_by: {created_at: desc}, where: { order_status: { _eq: "checkout" } }) {
        id
        order_ref_id
        table_no
        table_place
        order_summary_amount
        order_additional_service_amount
        order_total_amount
        order_status
        employee
        comments
        customer_number
        created_at
        check_out_id
        order_items {
          id
          item_name
          item_quantity
          item_cost
          item_description
          status
          created_at
          order_id
        }
      }
    }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
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
        comments
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

  updateOrderStatusWithCheckoutId(itemId: any, order_status: any, check_out_id: any): any {
    const mutation = gql`
      mutation update_kubera_order_checkout($itemId: Int!, $order_status: String!, $check_out_id: String!) {
        update_kubera_order(
          where: { id: { _eq: $itemId } }
          _set: { order_status: $order_status, check_out_id: $check_out_id }
        ) {
          returning {
            created_at
            id
            order_status
            check_out_id
          }
        }
      }
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        itemId,
        order_status,
        check_out_id
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  updateMultipleOrdersCheckout(orderIds: number[], order_status: string, check_out_id: string): any {
    const mutation = gql`
      mutation update_multiple_orders_checkout($orderIds: [Int!]!, $order_status: String!, $check_out_id: String!) {
        update_kubera_order(
          where: { id: { _in: $orderIds } }
          _set: { order_status: $order_status, check_out_id: $check_out_id }
        ) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        orderIds,
        order_status,
        check_out_id
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  deleteOrderItemsByOrderIds(orderIds: number[]): any {
    const mutation = gql`
      mutation delete_kubera_order_item($orderIds: [Int!]!) {
        delete_kubera_order_item(where: { order_id: { _in: $orderIds } }) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        orderIds
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
    });
  }

  insertMultipleOrderItems(objects: any[]): any {
    const mutation = gql`
      mutation insert_kubera_order_item($objects: [kubera_order_item_insert_input!]!) {
        insert_kubera_order_item(objects: $objects) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        objects
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
    });
  }

  updateMultipleOrderItems(updates: any[]): any {
    const mutation = gql`
      mutation update_multiple_order_items($updates: [kubera_order_item_updates!]!) {
        update_kubera_order_item_many(updates: $updates) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        updates
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
    });
  }

  batchEditOrder(itemUpdates: any[], orderUpdates: any[]): any {
    const mutation = gql`
      mutation batch_edit_order($itemUpdates: [kubera_order_item_updates!]!, $orderUpdates: [kubera_order_updates!]!) {
        update_kubera_order_item_many(updates: $itemUpdates) {
          affected_rows
        }
        update_kubera_order_many(updates: $orderUpdates) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        itemUpdates,
        orderUpdates
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
    });
  }

  updateOrderTotals(orderId: number, order_summary_amount: number, order_additional_service_amount: number, order_total_amount: number): any {
    const mutation = gql`
      mutation update_kubera_order_totals($orderId: Int!, $summary: numeric!, $additional: numeric!, $total: numeric!) {
        update_kubera_order(
          where: { id: { _eq: $orderId } }
          _set: { 
            order_summary_amount: $summary, 
            order_additional_service_amount: $additional, 
            order_total_amount: $total 
          }
        ) {
          affected_rows
        }
      }
    `;
    return this.apollo.mutate({
      mutation,
      variables: {
        orderId,
        summary: order_summary_amount,
        additional: order_additional_service_amount,
        total: order_total_amount
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
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
  


  insertPaymentDetails(kubera_payment_details_insert_input:any): any {
    const mutation = gql`
mutation InsertPaymentDetail($kubera_payment_details_insert_input: kubera_payment_details_insert_input!) {
  insert_kubera_payment_details_one(object: $kubera_payment_details_insert_input) {
   
      created_at
			id
			actual_amount
			paid_amount
			order_id
			payment_mode
			created_time
      bill_no
  }
}
    
    
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        kubera_payment_details_insert_input
        
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }



  getPaymentDetails(kubera_payment_details_insert_input:any): any {
    const mutation = gql`
query get_payment_mode_summary {
  kubera_payment_details_aggregate(where: {created_at: {_eq: "10-29-2024"}}) {
    aggregate {
      sum {
        paid_amount
        actual_amount
      }
      count
    }
    nodes {
      paid_amount
      payment_mode
      actual_amount
    }
  }
}
    `;

    return this.apollo.mutate({
      mutation,
      variables: {
        kubera_payment_details_insert_input
      },
      context: { headers: { 'x-hasura-access-key': GRAPHQL_KEY } }
    });
  }

  getPaymentsByDate(dateStr: string): any {
    const query = gql`
      query GetPaymentsByDate($dateStr: String!) {
        kubera_payment_details(where: { created_at: { _eq: $dateStr } }) {
          id
          actual_amount
          paid_amount
          order_id
          payment_mode
          created_time
          bill_no
          created_at
        }
      }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      variables: {
        dateStr
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getPaidOrdersByIds(orderIds: number[]): any {
    const query = gql`
      query GetPaidOrdersByIds($orderIds: [Int!]!) {
        kubera_order(order_by: {created_at: desc}, where: { id: { _in: $orderIds } }) {
          id
          order_ref_id
          table_no
          table_place
          order_summary_amount
          order_additional_service_amount
          order_total_amount
          order_status
          employee
          comments
          customer_number
          created_at
          check_out_id
          order_items {
            id
            item_name
            item_quantity
            item_cost
            item_description
            status
            created_at
            order_id
          }
        }
      }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      variables: {
        orderIds
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getPaidOrdersByIdsAndCheckoutIds(orderIds: number[], checkoutIds: string[]): any {
    const query = gql`
      query GetPaidOrdersByIdsAndCheckoutIds($orderIds: [Int!]!, $checkoutIds: [String!]!) {
        kubera_order(
          order_by: {created_at: desc},
          where: {
            _or: [
              { id: { _in: $orderIds } },
              { check_out_id: { _in: $checkoutIds } }
            ]
          }
        ) {
          id
          order_ref_id
          table_no
          table_place
          order_summary_amount
          order_additional_service_amount
          order_total_amount
          order_status
          employee
          comments
          customer_number
          created_at
          check_out_id
          order_items {
            id
            item_name
            item_quantity
            item_cost
            item_description
            status
            created_at
            order_id
          }
        }
      }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      variables: {
        orderIds,
        checkoutIds
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

  getActiveOrdersBasic(status: string | string[], startDate: string): Observable<any> {
    const statuses = Array.isArray(status) ? status : [status];
    const query = gql`
      query GetActiveOrdersBasic($statuses: [String!]!, $startDate: timestamptz!) {
        kubera_order(where: {
          order_status: { _in: $statuses },
          created_at: { _gte: $startDate }
        }) {
          id
          order_status
        }
      }
    `;

    return this.apollo.query({
      query,
      fetchPolicy: 'network-only',
      variables: {
        statuses,
        startDate
      },
      context: {
        headers: {
          'x-hasura-access-key': GRAPHQL_KEY,
        },
      },
    });
  }

}