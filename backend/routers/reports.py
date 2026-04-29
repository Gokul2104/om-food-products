from fastapi import APIRouter, Depends, Query
from models.invoice import Invoice, PaymentMethod
from models.return_model import Return
from models.expense import Expense
from models.product import Product
from models.stock_entry import StockEntry, StockEntryType
from models.user import UserRole
from core.security import get_current_user
from datetime import datetime, timedelta
from typing import Optional
import re

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _filter_by_location(items, related_to_filter):
    """Filter invoices or expenses by related_to field.
    For expenses with related_to='Both', they match both 'Shop' and 'Stall' filters.
    """
    if not related_to_filter or related_to_filter == "All":
        return items
    return [
        item for item in items
        if (getattr(item, 'related_to', None) or 'Shop') in (related_to_filter, 'Both')
    ]


@router.get("/daily")
async def daily_report(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    related_to: Optional[str] = Query(None, description="Shop, Stall, or All"),
    _=Depends(get_current_user)
):
    if date:
        target = datetime.fromisoformat(date)
    else:
        # Today in IST
        target = datetime.utcnow() + timedelta(hours=5, minutes=30)

    # Define IST day start (00:00:00) and convert to UTC
    ist_day_start = target.replace(hour=0, minute=0, second=0, microsecond=0)
    day_start = ist_day_start - timedelta(hours=5, minutes=30)
    day_end = day_start + timedelta(days=1)

    all_invoices = await Invoice.find(
        Invoice.created_at >= day_start,
        Invoice.created_at < day_end
    ).to_list()

    all_returns = await Return.find(
        Return.created_at >= day_start,
        Return.created_at < day_end
    ).to_list()

    # Apply location filter
    invoices = _filter_by_location(all_invoices, related_to)
    returns = _filter_by_location(all_returns, related_to)

    gross_sales = sum(inv.grand_total for inv in invoices)
    refund_total = sum(ret.refund_amount for ret in returns)
    total_sales = gross_sales - refund_total
    
    total_discount = sum(inv.global_discount for inv in invoices)
    total_tax = sum(inv.tax_amount for inv in invoices)
    total_invoices = len(invoices)

    # Payment method breakdown (Net)
    payment_breakdown = {}
    for inv in invoices:
        pm = inv.payment_method
        payment_breakdown[pm] = payment_breakdown.get(pm, 0) + inv.grand_total
    
    for ret in returns:
        rm = ret.refund_method
        payment_breakdown[rm] = payment_breakdown.get(rm, 0) - ret.refund_amount

    # Hourly sales (Net)
    hourly = {}
    for inv in invoices:
        hour = inv.created_at.hour
        key = f"{hour:02d}:00"
        hourly[key] = hourly.get(key, 0) + inv.grand_total

    for ret in returns:
        hour = ret.created_at.hour
        key = f"{hour:02d}:00"
        hourly[key] = hourly.get(key, 0) - ret.refund_amount

    # Expenses for the day (filtered by location)
    all_expenses = await Expense.find(
        Expense.expense_date >= day_start,
        Expense.expense_date < day_end
    ).to_list()
    expenses = _filter_by_location(all_expenses, related_to)
    total_expenses = sum(e.amount for e in expenses)

    # Cost of goods sold (COGS) — cost_price * qty for each sold item
    cogs = 0.0
    total_selling_price = 0.0
    for inv in invoices:
        for item in inv.items:
            total_selling_price += item.line_total
            prod = await Product.get(item.product_id)
            if prod:
                cogs += prod.cost_price * item.quantity

    # Apply discount proportionally to selling price
    total_selling_price = round(total_sales, 2)
    total_cost_price = round(cogs, 2)
    total_profit = round(total_selling_price - total_cost_price, 2)
    final_profit = round(total_profit - total_expenses, 2)

    gross_profit = round(total_sales - cogs, 2)
    net_profit = round(gross_profit - total_expenses, 2)

    return {
        "date": target.date().isoformat(),
        "related_to": related_to or "All",
        "total_invoices": total_invoices,
        "total_sales": round(total_sales, 2),
        "total_discount": round(total_discount, 2),
        "total_tax": round(total_tax, 2),
        "cogs": total_cost_price,
        "total_expenses": round(total_expenses, 2),
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        # New explicit profit KPIs
        "total_selling_price": total_selling_price,
        "total_cost_price": total_cost_price,
        "total_profit": total_profit,
        "final_profit": final_profit,
        "payment_breakdown": {k: round(v, 2) for k, v in payment_breakdown.items()},
        "hourly_sales": {k: round(v, 2) for k, v in sorted(hourly.items())},
        "invoices": [
            {
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer_name,
                "grand_total": inv.grand_total,
                "payment_method": inv.payment_method,
                "payment_status": inv.payment_status,
                "related_to": getattr(inv, 'related_to', None) or "Shop",
                "created_at": inv.created_at
            }
            for inv in invoices
        ]
    }

@router.get("/monthly")
async def monthly_report(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    related_to: Optional[str] = Query(None, description="Shop, Stall, or All"),
    _=Depends(get_current_user)
):
    now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
    year = year or now_ist.year
    month = month or now_ist.month
    
    # Define IST month boundaries and convert to UTC
    ist_month_start = datetime(year, month, 1)
    month_start = ist_month_start - timedelta(hours=5, minutes=30)
    
    if month == 12:
        ist_month_end = datetime(year + 1, 1, 1)
    else:
        ist_month_end = datetime(year, month + 1, 1)
    month_end = ist_month_end - timedelta(hours=5, minutes=30)

    all_invoices = await Invoice.find(
        Invoice.created_at >= month_start,
        Invoice.created_at < month_end
    ).to_list()

    all_returns = await Return.find(
        Return.created_at >= month_start,
        Return.created_at < month_end
    ).to_list()

    # Apply location filter
    invoices = _filter_by_location(all_invoices, related_to)
    returns = _filter_by_location(all_returns, related_to)

    gross_sales = sum(inv.grand_total for inv in invoices)
    refund_total = sum(ret.refund_amount for ret in returns)
    total_sales = gross_sales - refund_total

    total_discount = sum(inv.global_discount for inv in invoices)
    total_tax = sum(inv.tax_amount for inv in invoices)

    # Daily breakdown (Net)
    daily = {}
    for inv in invoices:
        day = inv.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"sales": 0, "count": 0}
        daily[day]["sales"] += inv.grand_total
        daily[day]["count"] += 1
    
    for ret in returns:
        day = ret.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"sales": 0, "count": 0}
        daily[day]["sales"] -= ret.refund_amount

    # Payment breakdown (Net)
    payment_breakdown = {}
    for inv in invoices:
        pm = inv.payment_method
        payment_breakdown[pm] = payment_breakdown.get(pm, 0) + inv.grand_total

    for ret in returns:
        rm = ret.refund_method
        payment_breakdown[rm] = payment_breakdown.get(rm, 0) - ret.refund_amount

    # Expenses for the month (filtered by location)
    all_expenses = await Expense.find(
        Expense.expense_date >= month_start,
        Expense.expense_date < month_end
    ).to_list()
    expenses = _filter_by_location(all_expenses, related_to)
    total_expenses = sum(e.amount for e in expenses)
    expense_breakdown = {}
    for e in expenses:
        expense_breakdown[e.category] = round(expense_breakdown.get(e.category, 0) + e.amount, 2)

    # Cost of goods sold
    cogs = 0.0
    for inv in invoices:
        for item in inv.items:
            prod = await Product.get(item.product_id)
            if prod:
                cogs += prod.cost_price * item.quantity

    total_selling_price = round(total_sales, 2)
    total_cost_price = round(cogs, 2)
    total_profit = round(total_selling_price - total_cost_price, 2)
    final_profit = round(total_profit - total_expenses, 2)

    gross_profit = round(total_sales - cogs, 2)
    net_profit = round(gross_profit - total_expenses, 2)

    return {
        "year": year,
        "month": month,
        "related_to": related_to or "All",
        "total_invoices": len(invoices),
        "total_sales": round(total_sales, 2),
        "total_discount": round(total_discount, 2),
        "total_tax": round(total_tax, 2),
        "cogs": total_cost_price,
        "total_expenses": round(total_expenses, 2),
        "expense_breakdown": expense_breakdown,
        "gross_profit": gross_profit,
        "net_profit": net_profit,
        # New explicit profit KPIs
        "total_selling_price": total_selling_price,
        "total_cost_price": total_cost_price,
        "total_profit": total_profit,
        "final_profit": final_profit,
        "payment_breakdown": {k: round(v, 2) for k, v in payment_breakdown.items()},
        "daily_breakdown": {
            k: {"sales": round(v["sales"], 2), "count": v["count"]}
            for k, v in sorted(daily.items())
        }
    }

@router.get("/stock-summary")
async def stock_summary(_=Depends(get_current_user)):
    products = await Product.find_all().to_list()
    # Current Valuation
    total_stock_at_cost = sum(p.current_stock * p.cost_price for p in products if p.is_active)
    total_selling_value = sum(p.current_stock * p.selling_price for p in products if p.is_active)
    
    # Total Buy Price (Historical spend on stock)
    all_in_entries = await StockEntry.find(StockEntry.type == StockEntryType.IN).to_list()
    total_buy_price = sum((e.quantity * (e.unit_cost or 0)) for e in all_in_entries)

    # Total Sales Price (Historical revenue - Returns)
    all_invoices = await Invoice.find_all().to_list()
    all_returns = await Return.find_all().to_list()
    
    gross_revenue = sum(inv.grand_total for inv in all_invoices)
    total_refunds = sum(ret.refund_amount for ret in all_returns)
    total_sales_revenue = gross_revenue - total_refunds

    # Credits Pending
    credits_pending = sum((inv.grand_total - inv.paid_amount) for inv in all_invoices)

    low_stock = [p for p in products if p.is_active and p.current_stock <= p.min_stock_alert]
    out_of_stock = [p for p in products if p.is_active and p.current_stock == 0]

    return {
        "total_products": len([p for p in products if p.is_active]),
        "total_stock_value": round(total_stock_at_cost, 2),
        "total_selling_value": round(total_selling_value, 2),
        "total_buy_price": round(total_buy_price, 2),
        "total_sales_price": round(total_sales_revenue, 2),
        "credits_pending": round(credits_pending, 2),
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_items": [
            {"name": p.name, "p_id": p.p_id, "current_stock": p.current_stock, "min_stock_alert": p.min_stock_alert}
            for p in low_stock
        ]
    }

@router.get("/top-products")
async def top_products(
    limit: int = Query(default=10),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    _=Depends(get_current_user)
):
    invoices = await Invoice.find_all().to_list()
    product_sales = {}

    for inv in invoices:
        if date_from:
            df = datetime.fromisoformat(date_from)
            if inv.created_at < df:
                continue
        if date_to:
            dt = datetime.fromisoformat(date_to)
            if inv.created_at > dt:
                continue
        for item in inv.items:
            pid = item.product_id
            if pid not in product_sales:
                product_sales[pid] = {"name": item.product_name, "qty": 0, "revenue": 0}
            product_sales[pid]["qty"] += item.quantity
            product_sales[pid]["revenue"] += item.line_total

    sorted_products = sorted(product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)
    # Limit results
    final_products = sorted_products[:limit]
    
    return [
        {"product_id": k, "name": v["name"], "qty_sold": v["qty"], "revenue": round(v["revenue"], 2)}
        for k, v in final_products
    ]
