import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { gql } from 'graphql-tag';
import { ResponseDto } from '../dtos/responseDto';
import { SharedService } from './shared-service';

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
          order_items {
            item_name
            item_description
            item_cost
            item_quantity
            order_ref_id
          }
        }
      }
      
      `,
      variables: {
       
        kubera_order_insert_input
      },
      context: {
        headers: {
          'x-hasura-access-key': '1YgBZ03vEHJxek3JftBf8yg57IVJeWzBKMvO1tYs4x6UQuOeGGSkznWRCHl0nlq8',
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
}