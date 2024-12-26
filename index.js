require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.8vksczm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db("insertDB");
    const contactCollection = database.collection("contactMessages");
    const projectCollection = database.collection("project");

    app.get('/projects', async (req, res) => {
      const userEmail = req.query.userEmail;
      if (!userEmail) {
        return res.status(400).send({ message: "User email is required" });
      }

      try {
        const result = await projectCollection.find({ userEmail }).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).send({ message: "Error fetching projects" });
      }
    });

    app.post('/projects', async (req, res) => {
      const {
        name, description, github_link, live_link, image, client_link, server_link, userEmail
      } = req.body;

      if (!name || !description || !github_link || !live_link || !image || !userEmail) {
        return res.status(400).send({ message: "Missing required fields" });
      }

      const projectData = {
        name, description, github_link, live_link, image,
        client_link: client_link || null,
        server_link: server_link || null,
        userEmail,
        createdAt: new Date()
      };

      try {
        const result = await projectCollection.insertOne(projectData);
        res.status(201).send({ message: "Project added successfully", projectId: result.insertedId });
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get('/projects/:id', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      try {
        const project = await projectCollection.findOne({ _id: new ObjectId(id) });
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json(project);
      } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.patch('/projects/:id', async (req, res) => {
      const { id } = req.params;
      const {
        name, description, github_link, live_link, image, client_link, server_link, userEmail
      } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      try {
        const existingProject = await projectCollection.findOne({ _id: new ObjectId(id) });
        if (!existingProject) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (existingProject.userEmail !== userEmail) {
          return res.status(403).json({ message: "Unauthorized access" });
        }

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

        const result = await projectCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.matchedCount > 0) {
          res.status(200).json({ message: "Project updated successfully" });
        } else {
          res.status(404).json({ message: "Project not found" });
        }
      } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete('/projects/:id', async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid project ID" });
      }

      try {
        const result = await projectCollection.deleteOne({ _id: new ObjectId(id) });
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

    app.post('/submitContactForm', async (req, res) => {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      try {
        const result = await contactCollection.insertOne({
          name, email, message, date: new Date()
        });
        res.status(200).json({ message: "Message saved successfully!", id: result.insertedId });
      } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ message: "Failed to save message" });
      }
    });

    app.get('/', (req, res) => {
      res.send('API is running...');
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
