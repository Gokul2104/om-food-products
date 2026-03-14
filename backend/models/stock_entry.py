from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum

class StockEntryType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    RETURN = "RETURN"
    ADJUSTMENT = "ADJUSTMENT"

class StockEntry(Document):
    product_id: str
    product_name: str  # snapshot
    type: StockEntryType
    quantity: float
    unit_cost: Optional[float] = None  # cost per unit if IN
    notes: Optional[str] = None
    performed_by: str   # user id
    performed_by_name: str  # snapshot
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "stock_entries"
