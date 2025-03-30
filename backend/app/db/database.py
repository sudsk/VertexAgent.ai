# backend/app/database.py
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import uuid
from datetime import datetime

DATABASE_URL = "postgresql://user:password@localhost/vertexagent"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    framework = Column(String, nullable=False)
    model_id = Column(String, nullable=False)
    temperature = Column(Float, nullable=False, default=0.2)
    max_output_tokens = Column(Integer, nullable=False, default=1024)
    system_instruction = Column(Text, nullable=True)
    framework_config = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="DRAFT")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, nullable=True)
    
    deployments = relationship("Deployment", back_populates="agent")
    tests = relationship("AgentTest", back_populates="agent")

class Deployment(Base):
    __tablename__ = "deployments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    deployment_type = Column(String, nullable=False)
    version = Column(String, nullable=False)
    project_id = Column(String, nullable=False)
    region = Column(String, nullable=False)
    resource_name = Column(String, nullable=True)
    status = Column(String, nullable=False)
    endpoint_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    agent = relationship("Agent", back_populates="deployments")

class AgentTest(Base):
    __tablename__ = "agent_tests"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    metrics = Column(JSON, nullable=True)
    success = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    agent = relationship("Agent", back_populates="tests")

# Create all tables
Base.metadata.create_all(bind=engine)
