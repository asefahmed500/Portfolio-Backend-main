require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());


// Construct the MongoDB URI using environment variables
const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const uri = `mongodb+srv://${user}:${password}@cluster0.8vksczm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Connect the client to the server
client.connect().then(() => {
    const database = client.db("insertDB");
    const contactCollection = database.collection("contactMessages");

    // Define the route to handle form submissions
    app.post('/submitContactForm', async (req, res) => {
        console.log('Received data:', req.body);
        const { name, email, message } = req.body;
    
        if (!name || !email || !message) {
            console.log('Missing fields:', { name, email, message });
            return res.status(400).json({ error: 'All fields are required' });
        }
    
        try {
            const result = await contactCollection.insertOne({
                name,
                email,
                message,
                date: new Date()
            });
    
            console.log(`Inserted message with ID: ${result.insertedId}`);
            res.status(200).json({ message: 'Message saved successfully!' });
        } catch (error) {
            console.error('Error saving message:', error);
            res.status(500).json({ error: 'Failed to save message' });
        }
    });
    
    


    // Send a ping to confirm a successful connection
    client.db("admin").command({ ping: 1 }).then(() => {
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }).catch(console.dir);

}).catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
