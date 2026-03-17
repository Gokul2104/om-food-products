from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class RefundMethod(str, Enum):
    cash = "Cash"
    upi = "UPI"
    store_credit = "StoreCredit"

class ReturnItem(BaseModel):
    product_id: str
    product_name: str  # snapshot
    quantity: float
    reason: Optional[str] = None

class Return(Document):
    invoice_id: str
    invoice_number: str  # snapshot
    items: List[ReturnItem]
    refund_amount: float
    refund_method: RefundMethod = RefundMethod.cash
    processed_by: str       # user id
    processed_by_name: str  # snapshot
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "returns"
