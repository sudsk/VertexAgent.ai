# VertexAgent.ai

VertexAgent.ai is a comprehensive web-based interface that allows developers to manage, monitor, and interact with AI agents deployed on Google Cloud's Vertex AI Agent Engine.

![VertexAgent.ai Dashboard](https://example.com/dashboard-screenshot.png)

## Features

- **Agent Management**: Create, deploy, and manage AI agents with a user-friendly interface
- **Framework Support**: Work with multiple frameworks including Custom, LangChain, LlamaIndex, LangGraph, and CrewAI
- **Interactive Playground**: Test your agents in real-time through a chat interface
- **Detailed Metrics**: View performance statistics and logs for your agents
- **Multi-project Support**: Manage agents across different Google Cloud projects

## Prerequisites

- Node.js 16+ and npm
- A Google Cloud account with Vertex AI API enabled
- Service account with appropriate permissions for Vertex AI Agent Engine

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/VertexAgent.ai.git
cd VertexAgent.ai
```

### 2. Create Service Account Key

Create a service account in Google Cloud Console with the following roles:
- `roles/aiplatform.user`

Download the service account key file (JSON) and save it securely.

### 3. Set Up Backend Server

```bash
# Create server directory
mkdir -p server
cd server

# Initialize and install dependencies
npm init -y
npm install express cors axios google-auth-library dotenv

# Create .env file
echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/keyfile.json" > .env
```

Create a server file at `server/index.js` with the code provided in this repository.

### 4. Set Up Frontend

```bash
# Go back to the main directory
cd ..

# Install frontend dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 5. Start the Application

```bash
# Start the backend server
cd server
node index.js

# In a new terminal, start the frontend
cd /path/to/VertexAgent.ai
npm start
```

The application will be available at `http://localhost:3000`.

## Development Mode

For local development, you can run the frontend in development mode:

```bash
# Start the backend server
cd server
node index.js

# In a separate terminal, start the frontend in development mode
cd /path/to/VertexAgent.ai
npm start
```

## Accessing the App

- **Local Development**: http://localhost:3000

## Troubleshooting

### Backend Connection Issues

If the frontend cannot connect to the backend:

1. Verify that the backend server is running
2. Check that the `REACT_APP_API_URL` in your frontend `.env` file is correct
3. For VM deployments, ensure the firewall allows traffic on port 5000

### Authentication Issues

If you're having issues with Google Cloud authentication:

1. Verify that the service account key file path in your server `.env` is correct
2. Ensure the service account has the appropriate permissions
3. Check the server logs for authentication errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
