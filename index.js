require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    const ProjectColletion = client.db("insertDB").collection("project")



    app.get('/projects', async (req, res) => {
        const userEmail = req.query.userEmail; // Retrieve email from query parameter

        if (!userEmail) {
            return res.status(400).send({ message: "User email is required" });
        }

        try {
            const result = await ProjectColletion.find({ userEmail }).toArray(); // Filter projects by user email
            res.send(result);
        } catch (error) {
            console.error("Error fetching projects:", error);
            res.status(500).send({ message: "Error fetching projects" });
        }
    });


    // POST route to add a project associated with the user's email
    app.post('/projects', async (req, res) => {
        const {
            name,
            description,
            github_link,
            live_link,
            image,
            client_link,
            server_link,
            userEmail
        } = req.body;

        // Validate required fields
        if (!name || !description || !github_link || !live_link || !image || !userEmail) {
            return res.status(400).send({ message: "Missing required fields" });
        }

        const projectData = {
            name,
            description,
            github_link,
            live_link,
            image,
            client_link: client_link || null, // Default to null if not provided
            server_link: server_link || null, // Default to null if not provided
            userEmail,
            createdAt: new Date()
        };

        try {
            const result = await ProjectColletion.insertOne(projectData);
            res.status(201).send({ message: "Project added successfully", projectId: result.insertedId });
        } catch (error) {
            console.error("Error adding project:", error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    });


    // Fetch project details by ID
    app.get('/projects/:id', async (req, res) => {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        try {
            const project = await ProjectColletion.findOne({ _id: new ObjectId(id) });

            if (!project) {
                return res.status(404).json({ success: false, message: "Project not found" });
            }

            res.status(200).json({ success: true, data: project });
        } catch (error) {
            console.error("Error fetching project:", error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    });


    // Update project
    app.patch('/projects/:id', async (req, res) => {
        const { id } = req.params;
        const {
            name,
            description,
            github_link,
            live_link,
            image,
            client_link,
            server_link,
            userEmail
        } = req.body;

        // Validate ID
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        try {
            // Check if project exists
            const existingProject = await ProjectColletion.findOne({ _id: new ObjectId(id) });

            if (!existingProject) {
                return res.status(404).json({ success: false, message: "Project not found" });
            }

            // Authorization check
            if (existingProject.userEmail !== userEmail) {
                return res.status(403).json({ success: false, message: "Unauthorized access" });
            }

            // Prepare update data
            const updatedData = {
                ...(name && { name }),
                ...(description && { description }),
                ...(github_link && { github_link }),
                ...(live_link && { live_link }),
                ...(image && { image }),
                ...(client_link && { client_link }),
                ...(server_link && { server_link }),
                updatedAt: new Date()
            };

            // Update project
            const result = await ProjectColletion.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            if (result.matchedCount > 0) {
                return res.status(200).json({ success: true, message: "Project updated successfully" });
            } else {
                return res.status(404).json({ success: false, message: "Project not found" });
            }
        } catch (error) {
            console.error("Error updating project:", error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    });





    app.delete('/projects/:id', async (req, res) => {
        const { id } = req.params;
        console.log(id); // Log the id to make sure it's being passed correctly
        const query = { _id: new ObjectId(id) };  // Create the query with ObjectId
        console.log(query); // Log the query to debug

        try {
            const result = await ProjectColletion.deleteOne(query);
            if (result.deletedCount > 0) {
                res.status(200).send({ message: "Project deleted successfully" });
            } else {
                res.status(404).send({ message: "Project not found" });
            }
        } catch (error) {
            console.error("Error deleting project:", error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    });

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
