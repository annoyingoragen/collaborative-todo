import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import dotenv from 'dotenv';
import gql from 'graphql-tag';
import { MongoClient, ServerApiVersion,ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

import bcrypt from 'bcryptjs';

dotenv.config();


const typeDefs = gql`
   type Query {
    TaskLists: [TaskList!]!
     
    getTaskList(id:ID!):TaskList
  }

  type Mutation {
    signUp(input: SignUpInput!):AuthUser!
    signIn(input: SignInInput!):AuthUser!
  
    createTaskList(input: TaskListInput):TaskList!
    updateTaskList(input: UpdateTaskListInput):TaskList! 
    deleteTaskList(id: ID!): Boolean!
    addUserToTaskList(input : addUserToTaskListInput): TaskList


    createToDo(content: String!, taskListId: ID!): ToDo!
    updateToDo(id: ID!, content: String, isCompleted: Boolean): ToDo!
    deleteToDo(id: ID!): Boolean!
}

  input SignInInput{
    email: String!
    password: String!
  }

  input  SignUpInput {
    
    name: String!
    email: String!
    password: String!
    avatar: String
}

input  TaskListInput {
    
  title: String!
}
input  UpdateTaskListInput {
    
  title: String!
  id: ID!
}

input addUserToTaskListInput{
  taskListId: ID!
   userId: ID!
}

  type AuthUser {
    user:User!
    token:String!
  }
  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
}
  type TaskList {
    id: ID!
    createdAt: String!
    title: String!
    progress: Float!

    users:[User!]!
    todos:[ToDo!]!

}

  type ToDo {
    id: ID!
    content: String!
    isCompleted: Boolean!

    taskList: TaskList!
}


  `;


const getToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' });

const getUserFromToken = async (token, DB) => {
  console.log(token)
  if (!token) {
    return null
  }
  const tokenData = jwt.verify(token, process.env.JWT_SECRET);
  console.log(tokenData)
  if (!tokenData?.id) {
    return null
  }
  console.log('now here')
  return await DB.collection('Users').findOne({ _id: ObjectId(tokenData.id) });

}

const resolvers = {
  Query: {
    TaskLists:async (_,__,contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');

      }
      console.log(contextValue.authScope._id)
      const userId=contextValue.authScope._id
      return await contextValue.DB.collection('TaskList').find({userIds:userId}).toArray();
    },
    getTaskList: async(_,input,contextValue)=>{
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');

      }

      try {
        const result=await contextValue.DB.collection('TaskList').findOne({
          _id:ObjectId(input.id)
        })
        console.log(result)
        return result;
      } catch (error) {
        return error
      }
    }
  },

  Mutation: {
    signUp: async (_, { input }, contextValue) => {

      const hashedPassword = bcrypt.hashSync(input.password);
      const toInsert = {
        ...input,
        password: hashedPassword
      }
      const result = await contextValue.DB.collection('Users').insertOne(toInsert);
      const user = {

        ...input,
        _id: result.insertedId.toString(),
      }

      if (result.acknowledged) {

        return {
          user,
          token: getToken(user)
        }
      }

    },
    signIn: async (_, { input }, contextValue) => {

      console.log("how you doing")
      const user = await contextValue.DB.collection('Users').findOne({ email: input.email });
      if (!user) {
        throw new Error('Invalid Credentials');
      }
      const isPasswordCorrect = bcrypt.compareSync(input.password, user.password);
      if (!isPasswordCorrect) {
        throw new Error('Invalid Credentials');
      } console.log(user)
      return {
        user,
        token: getToken(user)
      }
    },
    createTaskList: async (_, { input }, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');

      }
      console.log(contextValue.authScope._id)
      
      const toInsert = {
        ...input,
        createdAt: new Date().toISOString(),
        userIds: [contextValue.authScope._id]
      }
      const result = await contextValue.DB.collection('TaskList').insertOne(toInsert);
      const taskList = {

        ...toInsert,
        _id: result.insertedId.toString(),
      }
      console.log(result)
      return taskList

    },
    updateTaskList: async (_, { input }, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');

      }
      const title=input.title;
      const result = await contextValue.DB.collection('TaskList').updateOne(
                                                                  {_id:ObjectId(input.id)},
                                                                  {$set:{
                                                                    title
                                                                  }});
  
                                                                
      if(result.modifiedCount){
        return await contextValue.DB.collection('TaskList').findOne({_id:ObjectId(input.id)});
      }

    },
    deleteTaskList: async(_,input,contextValue)=>{
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');
      }
      console.log(input)
      try {
        const result=await contextValue.DB.collection('TaskList').deleteOne({
          _id:ObjectId(input.id)
        })
        console.log(result)
        return true;
      } catch (error) {
        return error
      }
     
    
    },
    
    addUserToTaskList: async(_, { input}, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');
      }

      const taskList = await contextValue.DB.collection('TaskList').findOne({ _id: ObjectId(input.taskListId) });
      if (!taskList) {
        return null;
      }
      if (taskList.userIds.find((dbId) => dbId.toString() === input.userId.toString())) {
        return taskList;
      }
      await contextValue.DB.collection('TaskList')
              .updateOne({
                _id: ObjectId(input.taskListId)
              }, {
                $push: {
                  userIds: ObjectId(input.userId),
                }
              })
      taskList.userIds.push(ObjectId(input.userId))
      return taskList;
    },

    // ToDo Items
    createToDo: async(_, { content, taskListId }, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');
      }
      const newToDo = {
        content, 
        taskListId: ObjectId(taskListId),
        isCompleted: false,
      }
      const result = await contextValue.DB.collection('ToDo').insertOne(newToDo);
      return  {
        

        ...newToDo,
        _id: result.insertedId.toString(),
      }
    },

    updateToDo: async(_, data, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');
      }
      const result = await contextValue.DB.collection('ToDo')
                            .updateOne({
                              _id: ObjectId(data.id)
                            }, {
                              $set: data
                            })
      
      return await contextValue.DB.collection('ToDo').findOne({ _id: ObjectId(data.id) });
    },

    deleteToDo: async(_, { id }, contextValue) => {
      if(!contextValue.authScope){
        throw new Error('Authentication Error. Please sign in');
      }
      // TODO only collaborators of this task list should be able to delete
      await contextValue.DB.collection('ToDo').deleteOne({ _id: ObjectId(id) });

      return true;
    },
   
  },

  User: {
    id({ _id, id }) {
      return _id || id
    }
  },
  TaskList: {
    id({ _id, id }) {
      return _id || id
    },
    // progress:()=>0,
    progress: async ({ _id }, _, { DB })  => {
      const todos = await DB.collection('ToDo').find({ taskListId: ObjectId(_id)}).toArray()
      const completed = todos.filter(todo => todo.isCompleted);

      if (todos.length === 0) {
        return 0;
      }

      return 100 * completed.length / todos.length
    },
    users: async ({ userIds }, _, { DB }) => Promise.all(
      userIds.map((userId) => (
        DB.collection('Users').findOne({ _id: userId}))
      )
    ),
    todos: async ({ _id }, _, { DB }) => (
      await DB.collection('ToDo').find({ taskListId: ObjectId(_id)}).toArray()
    ), 
  },
  ToDo: {
    id: ({ _id, id }) => _id || id,
    taskList: async ({ taskListId }, _, { DB }) => (
      await DB.collection('TaskList').findOne({ _id: ObjectId(taskListId) })
    )
  },

};


const DB = async () => {
  const client = new MongoClient(process.env.DB_URI,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1
    });
  await client.connect();


  return client.db();

}

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,

});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } =
  await startStandaloneServer(server, {
    // context:DB,
    context: async ({ req, res }) => ({

      authScope: await getUserFromToken(req.headers.authorization, await DB()),
      DB: await DB()

    }),
    listen: { port: 4000 },
  });


console.log(`🚀  Server ready at: ${url}`);


