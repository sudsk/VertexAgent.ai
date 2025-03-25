# VertexAgent.ai

VertexAgent.ai is a comprehensive web-based interface that allows developers to manage, monitor, and interact with AI agents deployed on Google Cloud's Vertex AI Agent Engine.

![VertexAgent.ai Dashboard](https://example.com/dashboard-screenshot.png)

## Architecture

```
┌─────────────────────────────────────┐      ┌─────────────────────────────┐
│             Frontend                │      │          Backend            │
│  ┌─────────────┐    ┌─────────────┐ │      │  ┌─────────────────────┐   │
│  │  React UI   │◄───┤   API       │ │      │  │  FastAPI/Express    │   │
│  │  Components │    │   Services  │◄┼──────┼──┤  REST API Server    │   │
│  └─────────────┘    └─────────────┘ │      │  └─────────────────────┘   │
│                                     │      │             │               │
│  ┌─────────────┐    ┌─────────────┐ │      │  ┌─────────────────────┐   │
│  │  Templates  │    │   State     │ │      │  │  Google Auth        │   │
│  │  System     │    │   Management│ │      │  │  Service            │   │
│  └─────────────┘    └─────────────┘ │      │  └─────────────────────┘   │
└─────────────────────────────────────┘      │             │               │
                                             │  ┌─────────────────────┐   │
                                             │  │  Vertex AI Agent    │   │
                                             │  │  Engine API Client  │   │
                                             │  └─────────────────────┘   │
                                             └─────────────────────────────┘
                                                          │
                                             ┌─────────────────────────────┐
                                             │    Google Cloud Platform    │
                                             │  ┌─────────────────────┐   │
                                             │  │  Vertex AI          │   │
                                             │  │  Agent Engine       │   │
                                             │  └─────────────────────┘   │
                                             └─────────────────────────────┘
```

## Features

- **Agent Management**: Create, deploy, and manage AI agents with a user-friendly interface
- **Framework Support**: Work with multiple frameworks including Custom, LangChain, LlamaIndex, LangGraph, and CrewAI
- **Template System**: Pre-built templates for different frameworks to help you get started quickly
- **Interactive Playground**: Test your agents in real-time through a chat interface
- **Detailed Metrics**: View performance statistics and logs for your agents
- **Multi-project Support**: Manage agents across different Google Cloud projects

## Project Structure

```
VertexAgent.ai/
├── frontend/               # React frontend application
│   ├── public/             # Static files
│   ├── src/                # Source code
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utility functions
│   ├── package.json        # Frontend dependencies
│   └── .env                # Frontend environment variables
│
├── backend/                # Backend server (FastAPI or Express)
│   ├── app/                # Python FastAPI application
│   │   ├── api/            # API endpoints
│   │   ├── models/         # Data models
│   │   ├── services/       # Service layer
│   │   └── main.py         # FastAPI entry point
│   ├── index.js            # Express server entry point
│   ├── package.json        # Node.js dependencies
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Backend environment variables
│
├── README.md               # Project documentation
└── .gitignore              # Git ignore file
```

## Prerequisites

- Node.js 16+ and npm
- Python 3.9+ and pip
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

Choose between FastAPI (Python) or Express (Node.js) implementation:

#### Option A: FastAPI (Python)

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/keyfile.json" > .env
echo "VERTEX_REGION=us-central1" >> .env

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

#### Option B: Express (Node.js)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/keyfile.json" > .env

# Start the server
node index.js
```

### 4. Set Up Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install frontend dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start the frontend development server
npm start
```

The application will be available at `http://localhost:3000`.

## Development Mode

For local development, you can run both services simultaneously:

```bash
# Terminal 1: Start the backend (FastAPI)
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000

# Terminal 2: Start the backend (Express alternative)
cd backend
node index.js

# Terminal 3: Start the frontend in development mode
cd frontend
npm start
```

## Using Templates

VertexAgent.ai includes a template system to help you get started with different frameworks:

1. When creating a new agent, select a framework (LangGraph or CrewAI)
2. A selection of templates will appear
3. Choose a template to pre-fill the configuration with best practices
4. Customize as needed for your specific use case

Available templates include:
- **LangGraph**: Sequential and branching graph templates
- **CrewAI**: Research team and customer service team templates

## Accessing the App

- **Local Development**: http://localhost:3000

## Troubleshooting

### Backend Connection Issues

If the frontend cannot connect to the backend:

1. Verify that the backend server is running
2. Check that the `REACT_APP_API_URL` in your frontend `.env` file is correct
3. Ensure your firewall allows traffic on port 5000

### Authentication Issues

If you're having issues with Google Cloud authentication:

1. Verify that the service account key file path in your backend `.env` is correct
2. Ensure the service account has the appropriate permissions
3. Check the server logs for authentication errors

### Python Environment Issues

If you're having issues with the Python backend:

1. Ensure you're using Python 3.9 or higher
2. Check that all dependencies are installed: `pip install -r requirements.txt`
3. Verify that the virtual environment is activated
4. Check for any error messages in the console

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
