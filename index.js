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



    // Get all projects
    app.get('/projects', async (req, res) => {
        try {
            const result = await ProjectColletion.find().toArray(); // No userEmail filtering
            res.send(result);
        } catch (error) {
            console.error("Error fetching projects:", error);
            res.status(500).send({ message: "Error fetching projects" });
        }
    });

    // POST route to add a project
    app.post('/projects', async (req, res) => {
        const { name, description, github_link, live_link, image, client_link, server_link } = req.body;

        // Validate required fields
        if (!name || !description || !github_link || !live_link || !image) {
            return res.status(400).send({ message: "Missing required fields" });
        }

        const projectData = {
            name,
            description,
            github_link,
            live_link,
            image,
            client_link: client_link || null, // Optional
            server_link: server_link || null, // Optional
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

    // Get project by ID
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
            console.error(error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    });

    // PATCH route to update a project (no email logic)
    app.patch('/projects/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description, github_link, live_link, image, client_link, server_link } = req.body;

        const updatedData = {
            name,
            description,
            github_link,
            live_link,
            image,
            client_link: client_link || null,
            server_link: server_link || null,
        };

        try {
            const result = await ProjectColletion.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Project not found" });
            }

            res.status(200).json({ message: "Project updated successfully" });
        } catch (error) {
            console.error("Error updating project:", error);
            res.status(500).json({ message: "Error updating project" });
        }
    });

    // DELETE route to delete a project
    app.delete('/projects/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await ProjectColletion.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Project not found" });
            }

            res.status(200).json({ message: "Project deleted successfully" });
        } catch (error) {
            console.error("Error deleting project:", error);
            res.status(500).json({ message: "Error deleting project" });
        }
    });
});


// Send a ping to confirm a successful connection
client.db("admin").command({ ping: 1 }).then(() => {
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
