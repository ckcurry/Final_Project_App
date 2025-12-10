import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Task: a
    .model({
      name: a.string().required(),
      dueDate: a.string().required(),
      recurrence: a.string().required(),
      category: a.string().required(),
      notes: a.hasMany('TaskNote', 'taskId'),
    })
    .authorization((allow) => [allow.owner()]),

  TaskNote: a
    .model({
      taskId: a.id().required(),
      task: a.belongsTo('Task', 'taskId'),
      text: a.string(),
      voice: a.string(),
      timestamp: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  Project: a
    .model({
      name: a.string().required(),
      milestones: a.hasMany('Milestone', 'projectId'),
    })
    .authorization((allow) => [allow.owner()]),

  Milestone: a
    .model({
      projectId: a.id().required(),
      project: a.belongsTo('Project', 'projectId'),
      name: a.string().required(),
      footstones: a.hasMany('Footstone', 'milestoneId'),
    })
    .authorization((allow) => [allow.owner()]),

  Footstone: a
    .model({
      milestoneId: a.id().required(),
      milestone: a.belongsTo('Milestone', 'milestoneId'),
      name: a.string().required(),
      plans: a.string().array(),
      updates: a.string().array(),
    })
    .authorization((allow) => [allow.owner()]),

  Household: a
    .model({
      name: a.string().required(),
      inviteCode: a.string().required(),
      users: a.hasMany('HouseholdUser', 'householdId'),
      projects: a.hasMany('HouseholdProject', 'householdId'),
      tasks: a.hasMany('HouseholdTask', 'householdId'),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['household'])]),

  HouseholdUser: a
    .model({
      householdId: a.id().required(),
      household: a.belongsTo('Household', 'householdId'),
      userId: a.string().required(),
      role: a.string().required(),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['household'])]),

  HouseholdProject: a
    .model({
      householdId: a.id().required(),
      household: a.belongsTo('Household', 'householdId'),
      name: a.string().required(),
      milestones: a.hasMany('HouseholdMilestone', 'projectId'),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['household'])]),

  HouseholdMilestone: a
    .model({
      projectId: a.id().required(),
      project: a.belongsTo('HouseholdProject', 'projectId'),
      name: a.string().required(),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['household'])]),

  HouseholdTask: a
    .model({
      householdId: a.id().required(),
      household: a.belongsTo('Household', 'householdId'),
      name: a.string().required(),
      dueDate: a.string().required(),
      assignedTo: a.string(),
      completed: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner(), allow.groups(['household'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
