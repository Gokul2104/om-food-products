from beanie import Document, Link
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum
from models.category import Category

class UnitType(str, Enum):
    pcs = "pcs"
    kg = "kg"
    ltr = "ltr"
    box = "box"
    gm = "gm"
    dozen = "dozen"

class Product(Document):
    p_id: str = Field(..., description="Unique SKU like PRD-0001")
    name: str
    category_id: Optional[str] = None  # stored as string id for simplicity
    category_name: Optional[str] = None  # snapshot for quick display
    description: Optional[str] = None
    unit: UnitType = UnitType.pcs
    selling_price: float
    cost_price: float
    tax_rate: float = 0.0  # GST percentage
    min_stock_alert: int = 5
    current_stock: float = 0.0  # Denormalized fast-access stock count
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "products"
