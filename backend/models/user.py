from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "Admin"
    stock_manager = "StockManager"
    biller = "Biller"

class User(Document):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.biller
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
