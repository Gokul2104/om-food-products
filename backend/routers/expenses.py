from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from models.expense import Expense, RelatedTo
from models.user import User, UserRole
from core.security import require_roles, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

admin_only = require_roles(UserRole.admin)


# --- Suggested categories (returned to frontend for datalist) ---
SUGGESTED_CATEGORIES = [
    "Rent", "EB Bill", "Water Bill", "Internet", "Salary",
    "Transport", "Packaging", "Maintenance", "Cleaning",
    "Marketing", "Miscellaneous"
]


class ExpenseCreate(BaseModel):
    category: str
    description: Optional[str] = None
    amount: float
    related_to: RelatedTo = RelatedTo.shop
    expense_date: str   # ISO date string "YYYY-MM-DD" from frontend


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    related_to: Optional[RelatedTo] = None
    expense_date: Optional[str] = None


def parse_expense_date(date_str: str) -> datetime:
    """Parse a YYYY-MM-DD date string as IST midnight, convert to UTC."""
    from datetime import timedelta
    d = datetime.fromisoformat(date_str).replace(hour=0, minute=0, second=0, microsecond=0)
    # d is IST midnight, subtract 5:30 to get UTC
    return d - timedelta(hours=5, minutes=30)


def ensure_utc(dt: datetime) -> datetime:
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def expense_out(e: Expense):
    return {
        "id": str(e.id),
        "category": e.category,
        "description": e.description,
        "amount": e.amount,
        "related_to": getattr(e, 'related_to', None) or "Shop",
        "expense_date": ensure_utc(e.expense_date).isoformat(),
        "created_by_name": e.created_by_name,
        "created_at": ensure_utc(e.created_at).isoformat(),
    }


# --- Endpoints ---

@router.get("/categories")
async def get_suggested_categories(_=Depends(get_current_user)):
    """Return default category suggestions."""
    return SUGGESTED_CATEGORIES


@router.post("", dependencies=[Depends(admin_only)], status_code=201)
async def create_expense(data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    expense = Expense(
        category=data.category.strip(),
        description=data.description,
        amount=data.amount,
        related_to=data.related_to,
        expense_date=parse_expense_date(data.expense_date),
        created_by=str(current_user.id),
        created_by_name=current_user.name,
    )
    await expense.insert()
    return expense_out(expense)


@router.get("")
async def list_expenses(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    related_to: Optional[str] = Query(None),
    _=Depends(get_current_user)
):
    from datetime import timedelta
    expenses = await Expense.find_all().sort("-expense_date").to_list()

    if month and year:
        # Filter by IST month — expense_date stored as UTC (IST - 5:30)
        # IST month start → UTC
        ist_start = datetime(year, month, 1)
        utc_start = ist_start - timedelta(hours=5, minutes=30)
        if month == 12:
            ist_end = datetime(year + 1, 1, 1)
        else:
            ist_end = datetime(year, month + 1, 1)
        utc_end = ist_end - timedelta(hours=5, minutes=30)
        expenses = [e for e in expenses if utc_start <= e.expense_date < utc_end]

    if related_to and related_to != "All":
        expenses = [
            e for e in expenses
            if (getattr(e, 'related_to', None) or 'Shop') in (related_to, 'Both')
        ]

    return [expense_out(e) for e in expenses]


@router.put("/{expense_id}", dependencies=[Depends(admin_only)])
async def update_expense(expense_id: str, data: ExpenseUpdate):
    expense = await Expense.get(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if data.category is not None:
        expense.category = data.category.strip()
    if data.description is not None:
        expense.description = data.description
    if data.amount is not None:
        expense.amount = data.amount
    if data.related_to is not None:
        expense.related_to = data.related_to
    if data.expense_date is not None:
        expense.expense_date = parse_expense_date(data.expense_date)

    await expense.save()
    return expense_out(expense)


@router.delete("/{expense_id}", dependencies=[Depends(admin_only)], status_code=204)
async def delete_expense(expense_id: str):
    expense = await Expense.get(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await expense.delete()
