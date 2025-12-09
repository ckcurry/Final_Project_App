// amplify/data/resource.ts
import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string().required(),
      isDone: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner()]),
});

export const data = defineData({
  schema,
});
