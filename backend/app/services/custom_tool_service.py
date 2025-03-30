# backend/app/services/custom_tool_service.py
import importlib.util
import sys
import uuid
import inspect
from typing import Dict, Any, List, Callable, Optional
from sqlalchemy.orm import Session

from app.database import CustomTool

class CustomToolService:
    """Service for managing and executing custom tools."""
    
    @staticmethod
    def create_tool(db: Session, name: str, description: str, code: str, user_id: Optional[str] = None) -> CustomTool:
        """Creates a new custom tool."""
        # Validate the tool code (check that it's a valid Python function)
        CustomToolService._validate_tool_code(code)
        
        # Create the tool
        tool = CustomTool(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            code=code,
            user_id=user_id
        )
        
        db.add(tool)
        db.commit()
        db.refresh(tool)
        
        return tool
    
    @staticmethod
    def list_tools(db: Session, user_id: Optional[str] = None) -> List[CustomTool]:
        """Lists all custom tools for a user."""
        query = db.query(CustomTool)
        
        if user_id:
            query = query.filter(CustomTool.user_id == user_id)
            
        return query.all()
    
    @staticmethod
    def get_tool(db: Session, tool_id: str) -> Optional[CustomTool]:
        """Gets a custom tool by ID."""
        return db.query(CustomTool).filter(CustomTool.id == tool_id).first()
    
    @staticmethod
    def execute_tool(db: Session, tool_id: str, params: Dict[str, Any]) -> str:
        """Executes a custom tool with parameters."""
        tool = CustomToolService.get_tool(db, tool_id)
        if not tool:
            raise ValueError(f"Tool with ID {tool_id} not found")
            
        # Create a module for the tool code
        module_name = f"custom_tool_{tool_id}"
        spec = importlib.util.spec_from_loader(module_name, loader=None)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        
        # Execute the tool code in a sandbox
        restricted_globals = {
            "__builtins__": {
                # Allow only safe builtins
                "abs": abs,
                "all": all,
                "any": any,
                "bool": bool,
                "dict": dict,
                "enumerate": enumerate,
                "filter": filter,
                "float": float,
                "int": int,
                "isinstance": isinstance,
                "len": len,
                "list": list,
                "map": map,
                "max": max,
                "min": min,
                "range": range,
                "round": round,
                "set": set,
                "sorted": sorted,
                "str": str,
                "sum": sum,
                "tuple": tuple,
                "zip": zip
            }
        }
        
        try:
            # Execute the tool code to define the function
            exec(tool.code, restricted_globals)
            
            # Find the function in the globals
            function_name = None
            for name, obj in restricted_globals.items():
                if callable(obj) and name != "__builtins__":
                    function_name = name
                    break
            
            if not function_name:
                raise ValueError("No function found in tool code")
                
            # Call the function with the parameters
            function = restricted_globals[function_name]
            signature = inspect.signature(function)
            
            # Map parameters by name
            valid_params = {}
            for param_name in signature.parameters:
                if param_name in params:
                    valid_params[param_name] = params[param_name]
            
            # Execute the function
            result = function(**valid_params)
            
            return str(result)
        except Exception as e:
            return f"Error executing tool: {str(e)}"
    
    @staticmethod
    def _validate_tool_code(code: str) -> bool:
        """Validates that the tool code defines a valid Python function."""
        try:
            # Compile the code to check syntax
            compile(code, "<string>", "exec")
            
            # Check that the code defines a function
            restricted_globals = {}
            exec(code, restricted_globals)
            
            has_function = False
            for name, obj in restricted_globals.items():
                if callable(obj) and name != "__builtins__":
                    has_function = True
                    break
            
            if not has_function:
                raise ValueError("Tool code must define at least one function")
                
            return True
        except Exception as e:
            raise ValueError(f"Invalid tool code: {str(e)}")
