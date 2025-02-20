require('dotenv').config()

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://taskzenn.netlify.app'
    ],
    credentials: true
}));

app.use(cookieParser());

// mongo db connection 
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.4ayta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        console.log("successfully connected to MongoDB!");

        // database 
        const database = client.db('ToDoListSCIC');

        // users collection
        const userCollection = database.collection('users');

        // tasks collection 
        const taskCollection = database.collection('tasks');

        // activity collection
        const activityCollection = database.collection('activity');


        // middleware
        // verify token middleware
        const verifyToken = (req, res, next) => {
            // console.log("Inside the verify token");
            // console.log("received request:", req?.headers?.authorization);
            if (!req?.headers?.authorization) {
                return res.status(401).json({ message: "Unauthorized Access!" });
            }

            // get token from the headers 
            const token = req?.headers?.authorization;
            // console.log("Received Token", token);

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    console.error('JWT Verification Error:', err.message);
                    return res.status(401).json({ message: err.message });
                }
                // console.log('Decoded Token:', decoded);
                req.user = decoded;
                next();
            })
        }

        // JWT token create and remove APIS
        // JWT token create API 
        app.post('/jwt/create', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7h' });

            // res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
            // res.setHeader("Access-Control-Allow-Credentials", "true");

            res.send({ token })
        })

        // users related APIS 
        // insert user API 
        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const existingUser = await userCollection.findOne({ email: user?.email });

                if (existingUser) {
                    const updatedData = {
                        $set: {
                            lastLoginTime: user?.lastLoginTime
                        }
                    };
                    const result = await userCollection.updateOne({ email: user?.email }, updatedData);

                    return res.json({
                        status: false,
                        message: 'User already exists, lastSignInTime updated',
                        data: result
                    });
                }
                const insertResult = await userCollection.insertOne(user);
                res.json({
                    status: true,
                    message: 'User added successfully',
                    data: insertResult
                });
            } catch (error) {
                console.error('Error adding/updating user:', error);
                res.status(500).json({
                    status: false,
                    message: 'Failed to add or update userr',
                    error: error.message
                });
            }
        });

        // delete user form the db API 
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const user = await userCollection.findOne(query);
            const deletedAllCartItems = await cartCollection.deleteMany({ orderer: user?.email })
            const result = await userCollection.deleteOne(query);

            res.json({
                status: true,
                data: result,
                deleted: deletedAllCartItems
            })
        })

        // get all users API 
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // get one user API 
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.json({
                status: true,
                data: result
            })
        })

        // update one user info API 
        app.patch('/user', async (req, res) => {
            const body = req.body
            const id = body?.id
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: body?.name,
                }
            }
            console.log(updatedDoc);
            const result = await userCollection.updateOne(query, updatedDoc);
            res.json({
                status: true,
                data: result
            })
        })


        // task related APIs
        // insert task API
        app.post('/tasks', verifyToken, async (req, res) => {
            try {
                const task = req.body;
                const result = await taskCollection.insertOne(task);
                res.json({
                    status: true,
                    message: 'Task added successfully',
                    data: result
                });
            } catch (error) {
                console.error('Error adding task:', error);
                res.status(500).json({
                    status: false,
                    message: 'Failed to add task',
                    error: error.message
                });
            }
        })

        // get all tasks API 
        app.get('/tasks', verifyToken, async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.json({
                status: true,
                data: result
            })
        })

        // get one tasks API 
        app.get('/tasks/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.findOne(query);
            res.json({
                status: true,
                data: result
            })
        })

        // update task API
        app.patch('/tasks/:id', verifyToken, async (req, res) => {
            const body = req.body
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    title: body?.title,
                    description: body?.description,
                }
            }
            const result = await taskCollection.updateOne(query, updatedDoc);
            res.json({
                status: true,
                data: result
            })
        })

        // delete task API
        app.delete('/tasks/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.deleteOne(query);
            res.json({
                status: true,
                data: result
            })
        })

        // change category of task API
        app.patch('/tasks-category/:id', verifyToken, async (req, res) => {
            const id = req.params.id 
            console.log(id);
            const category = req.body.category
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    category: category,
                }
            }
            const result = await taskCollection.updateOne(query, updatedDoc);
            res.json({
                status: true,
                data: result
            })
        })

        // activity related APIs 
        // insert activity API 
        app.post('/activity', verifyToken, async (req, res) => {
            const activity = req.body;
            const result = await activityCollection.insertOne(activity);
            res.json({
                status: true,
                data: result
            })
        })

        // get all the activities API
        app.get('/activity', verifyToken, async (req, res) => {
            const result = await activityCollection.find().toArray();
            res.json({
                status: true,
                data: result
            })
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.json({
        message: "Yoo Server is running well!!"
    })
})

module.exports = app;