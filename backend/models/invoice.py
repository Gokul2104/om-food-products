from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class PaymentMethod(str, Enum):
    cash = "Cash"
    upi = "UPI"
    credit = "Credit"

class PaymentStatus(str, Enum):
    paid = "Paid"
    pending = "Pending"
    partial = "Partial"

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit_price: float
    tax_rate: float = 0.0
    line_total: float  # unit_price * quantity (before tax & global discount)
    remaining_stock: float = 0.0  # post-sale stock of this product

class Invoice(Document):
    invoice_number: str  # e.g. INV-20260314-001
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[InvoiceItem]
    sub_total: float       # Sum of all line_total
    global_discount: float = 0.0
    tax_amount: float = 0.0
    grand_total: float     # (sub_total - global_discount) + tax_amount
    payment_method: PaymentMethod = PaymentMethod.cash
    payment_status: PaymentStatus = PaymentStatus.paid
    paid_amount: float
    created_by: str       # user id
    created_by_name: str  # snapshot
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "invoices"
