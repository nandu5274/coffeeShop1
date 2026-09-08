import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { NgModule } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { GRAPHQL_KEY } from './common/constanst';

const uri = 'https://glorious-marten-67.hasura.app/v1/graphql';

export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  const authLink = setContext(() => ({
    headers: {
      'x-hasura-admin-secret': GRAPHQL_KEY,
    },
  }));

  return {
    link: ApolloLink.from([authLink, httpLink.create({ uri })]),
    cache: new InMemoryCache(),
  };
}

@NgModule({
  exports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
