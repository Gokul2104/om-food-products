from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class RelatedTo(str, Enum):
    shop = "Shop"
    stall = "Stall"
    both = "Both"


class Expense(Document):
    category: str                     # Free text, e.g. "Rent", "EB Bill"
    description: Optional[str] = None # Extra notes
    amount: float
    related_to: RelatedTo = RelatedTo.shop  # Shop, Stall, or Both
    expense_date: datetime            # Date the expense occurred (IST, stored as UTC)
    created_by: str                   # user id
    created_by_name: str              # snapshot
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "expenses"
