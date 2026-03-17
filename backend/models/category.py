from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime

class Category(Document):
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "categories"
