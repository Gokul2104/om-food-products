from beanie import Document
from typing import Optional
from datetime import datetime

class Category(Document):
    name: str
    description: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "categories"
