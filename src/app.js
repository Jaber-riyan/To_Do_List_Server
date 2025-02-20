require('dotenv').config()

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
    origin: [
        'http://localhost:5173/',
    ]
}));

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
        const database = client.db('To Do SCIC');

        // users collection
        const userCollection = database.collection('users');



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