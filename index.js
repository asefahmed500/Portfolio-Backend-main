require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // For secure HTTP headers
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { body, validationResult } = require('express-validator'); // Input validation
const morgan = require('morgan'); // Request logging

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Log HTTP requests

// Validate environment variables
if (!process.env.MONGO_USER || !process.env.MONGO_PASSWORD) {
  console.error('Missing required environment variables: MONGO_USER, MONGO_PASSWORD');
  process.exit(1);
}

// MongoDB connection
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.8vksczm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    db = client.db('insertDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Routes
app.get('/projects', async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).json({ message: 'User email is required' });
  }

  try {
    const projects = await db.collection('project').find({ userEmail }).toArray();
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

app.post(
  '/projects',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('github_link').notEmpty().withMessage('GitHub link is required'),
    body('live_link').notEmpty().withMessage('Live link is required'),
    body('image').notEmpty().withMessage('Image is required'),
    body('userEmail').notEmpty().withMessage('User email is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, github_link, live_link, image, client_link, server_link, userEmail,
    } = req.body;

    const projectData = {
      name,
      description,
      github_link,
      live_link,
      image,
      client_link: client_link || null,
      server_link: server_link || null,
      userEmail,
      createdAt: new Date(),
    };

    try {
      const result = await db.collection('project').insertOne(projectData);
      res.status(201).json({ message: 'Project added successfully', projectId: result.insertedId });
    } catch (error) {
      console.error('Error adding project:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);

app.get('/projects/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const project = await db.collection('project').findOne({ _id: new ObjectId(id) });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.patch('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, description, github_link, live_link, image, client_link, server_link, userEmail,
  } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const existingProject = await db.collection('project').findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existingProject.userEmail !== userEmail) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const updatedData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(github_link && { github_link }),
      ...(live_link && { live_link }),
      ...(image && { image }),
      ...(client_link && { client_link }),
      ...(server_link && { server_link }),
      updatedAt: new Date(),
    };

    const result = await db.collection('project').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount > 0) {
      res.status(200).json({ message: 'Project updated successfully' });
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const result = await db.collection('project').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount > 0) {
      res.status(200).json({ message: 'Project deleted successfully' });
    } else {
      res.status(404).json({ message: 'Project not found' });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post(
  '/submitContactForm',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, message } = req.body;

    try {
      const result = await db.collection('contactMessages').insertOne({
        name,
        email,
        message,
        date: new Date(),
      });
      res.status(200).json({ message: 'Message saved successfully!', id: result.insertedId });
    } catch (error) {
      console.error('Error saving message:', error);
      res.status(500).json({ message: 'Failed to save message' });
    }
  }
);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is running...' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});

// Initialize DB connection
connectDB().catch(console.error);