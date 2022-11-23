import { builder } from '../builder';
import { lexicographicSortSchema, printSchema } from 'graphql';
import * as fs from 'fs';
import path from 'path';

import './activityLog';
import './costItem';
import './enums';
import './event';
import './eventOrganizer';
import './eventRegistration';
import './eventRegistrationCode';
import './eventTemplate';
import './eventTemplateCategory';
import './purchase';
import './receipt';
import './eventSubmission';
import './eventSubmissionItem';
import './shoppingCart';
import './lineItem';
import './tenant';
import './transaction';
import './user';
import './userOfTenant';
import './product';
import './stripePayment';
import './statistics';
import './stripeUserData';
import './productImage';
import './photoShare';
import {printSubgraphSchema} from "@apollo/subgraph";

export const schema = builder.toSubGraphSchema({});

const schemaAsString = printSubgraphSchema(lexicographicSortSchema(schema));

// we will write this schema to a file.
if (process.env.NODE_ENV !== 'production') {
  fs.writeFileSync(
      path.join(process.cwd(), './schema.graphql'),
      schemaAsString
  );
}
