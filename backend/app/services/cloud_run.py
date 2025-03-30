# backend/app/services/cloud_run.py
from typing import Dict, Any
import os
import json
import base64
import hashlib
from google.cloud import run_v2

class CloudRunService:
    def __init__(self):
        self.client = run_v2.ServicesClient()
        
    async def deploy_agent_to_cloud_run(self, project_id: str, region: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Deploys an agent to Cloud Run."""
        try:
            # Create a unique name for the service based on agent display name
            display_name = agent_data.get("displayName", "unnamed-agent")
            service_name = f"agent-{hashlib.md5(display_name.encode()).hexdigest()[:8]}"
            
            # Parent resource path
            parent = f"projects/{project_id}/locations/{region}"
            
            # Create the service configuration
            service = {
                "template": {
                    "containers": [
                        {
                            "image": "gcr.io/YOUR_PROJECT/vertexagent-runner:latest",  # You'll need to create this Docker image
                            "env": [
                                {
                                    "name": "AGENT_CONFIG",
                                    # Encode the agent config as base64 to avoid escaping issues
                                    "value": base64.b64encode(json.dumps(agent_data).encode()).decode()
                                },
                                {
                                    "name": "GOOGLE_PROJECT",
                                    "value": project_id
                                },
                                {
                                    "name": "GOOGLE_REGION",
                                    "value": region
                                }
                            ],
                            "resources": {
                                "limits": {
                                    "cpu": "1",
                                    "memory": "512Mi"
                                }
                            }
                        }
                    ],
                    "timeout": {
                        "seconds": 300
                    },
                    "service_account": f"vertexagent-runner@{project_id}.iam.gserviceaccount.com"  # You'll need to create this service account
                }
            }
            
            # Create or update the service
            operation = self.client.create_service(
                parent=parent,
                service_id=service_name,
                service=service
            )
            
            # Wait for the operation to complete
            result = operation.result()
            
            # Return the deployment information
            return {
                "name": result.name,
                "uri": result.uri,
                "status": "ACTIVE",
                "deployment_type": "CLOUD_RUN"
            }
            
        except Exception as e:
            print(f"Error deploying to Cloud Run: {str(e)}")
            raise
