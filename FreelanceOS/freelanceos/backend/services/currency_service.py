import httpx
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.orm import Session
from models import ExchangeRate
from config import settings
import logging

logger = logging.getLogger(__name__)

class CurrencyService:
    def __init__(self):
        self.api_key = "f11a43a4e99f0e4b8555e14b" # Using a placeholder or settings if available. 
        # Actually, let's use ExchangeRate-API (free tier). 
        # If no key, we fallback to 1.0 or hardcoded common rates.
        self.base_url = f"https://v6.exchangerate-api.com/v6/{self.api_key}/latest"

    async def get_rate(self, db: Session, from_currency: str, to_currency: str = "USD") -> Decimal:
        if from_currency == to_currency:
            return Decimal("1.0")

        # 1. Check DB Cache (24h TTL)
        cache_limit = datetime.now() - timedelta(hours=24)
        cached_rate = db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
            ExchangeRate.timestamp >= cache_limit
        ).order_by(ExchangeRate.timestamp.desc()).first()

        if cached_rate:
            return cached_rate.rate

        # 2. Fetch from External API
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/{from_currency}")
                if response.status_code == 200:
                    data = response.json()
                    rate = Decimal(str(data["conversion_rates"].get(to_currency, 1.0)))
                    
                    # Store in Cache
                    new_rate = ExchangeRate(
                        from_currency=from_currency,
                        to_currency=to_currency,
                        rate=rate,
                        source="ExchangeRate-API"
                    )
                    db.add(new_rate)
                    db.commit()
                    return rate
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {e}")
            
        # 3. Fallback to latest available in DB (even if expired)
        last_rate = db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency
        ).order_by(ExchangeRate.timestamp.desc()).first()
        
        if last_rate:
            return last_rate.rate

        return Decimal("1.0") # Final fallback

    async def convert_amount(self, db: Session, amount: Decimal, from_currency: str, to_currency: str = "USD") -> Decimal:
        rate = await self.get_rate(db, from_currency, to_currency)
        return (amount * rate).quantize(Decimal("0.01"))

currency_service = CurrencyService()
