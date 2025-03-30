# backend/agent_runner.py
import os
import json
import base64
from fastapi import FastAPI, Request
import uvicorn
from vertexai.generative_models import GenerativeModel, GenerationConfig

app = FastAPI()

# Parse agent configuration from environment variable
agent_config_b64 = os.environ.get("AGENT_CONFIG", "")
if agent_config_b64:
    agent_config = json.loads(base64.b64decode(agent_config_b64))
else:
    agent_config = {}

# Extract agent parameters
model_id = agent_config.get("modelId", "gemini-1.5-pro")
temperature = agent_config.get("temperature", 0.2)
max_output_tokens = agent_config.get("maxOutputTokens", 1024)
system_instruction = agent_config.get("systemInstruction", "")
framework = agent_config.get("framework", "CUSTOM")

# Initialize the model
model = GenerativeModel(model_id)
generation_config = GenerationConfig(
    temperature=temperature,
    max_output_tokens=max_output_tokens
)

@app.post("/")
async def process_request(request: Request):
    """Process an agent request."""
    try:
        # Get the request data
        data = await request.json()
        query = data.get("query", "")
        
        if not query:
            return {"error": "Query is required"}
        
        # Process with the appropriate framework
        if framework == "CUSTOM":
            # Create messages including system instruction if available
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": query})
            
            # Generate response
            response = model.generate_content(
                messages,
                generation_config=generation_config
            )
            
            return {
                "textResponse": response.text,
                "messages": [{"content": response.text}]
            }
            
        # Add support for other frameworks
        # ...
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
