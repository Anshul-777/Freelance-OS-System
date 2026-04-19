import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional, BinaryIO
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
from config import settings
import logging

logger = logging.getLogger(__name__)

class StorageProvider(ABC):
    @abstractmethod
    async def upload_file(self, file_data: BinaryIO, file_path: str, content_type: str) -> str:
        """Uploads a file and returns the storage path/URL identifier."""
        pass

    @abstractmethod
    async def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Returns a temporary signed URL for the file."""
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """Deletes a file from storage."""
        pass

class SupabaseStorageProvider(StorageProvider):
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set for SupabaseStorageProvider")
if HAS_SUPABASE:
    self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
else:
    raise ValueError("Supabase not available - install supabase package or set DEBUG=true")
        self.bucket = "freelanceos-receipts"

    async def upload_file(self, file_data: BinaryIO, file_path: str, content_type: str) -> str:
        try:
            # Supabase storage expects bytes
            file_data.seek(0)
            data = file_data.read()
            res = self.client.storage.from_(self.bucket).upload(
                path=file_path,
                file=data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            return file_path # In Supabase, we store the path
        except Exception as e:
            logger.error(f"Supabase upload error: {e}")
            raise

    async def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        try:
            res = self.client.storage.from_(self.bucket).create_signed_url(file_path, expires_in)
            return res.get("signedURL") or res.get("signed_url")
        except Exception as e:
            logger.error(f"Supabase signed URL error: {e}")
            return ""

    async def delete_file(self, file_path: str) -> bool:
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            return True
        except Exception as e:
            logger.error(f"Supabase delete error: {e}")
            return False

class LocalStorageProvider(StorageProvider):
    def __init__(self):
        self.base_dir = os.path.join(os.getcwd(), "uploads")
        if not os.path.exists(self.base_dir):
            os.makedirs(self.base_dir)

    async def upload_file(self, file_data: BinaryIO, file_path: str, content_type: str) -> str:
        full_path = os.path.join(self.base_dir, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as buffer:
            file_data.seek(0)
            shutil.copyfileobj(file_data, buffer)
        return file_path

    async def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        # In local mode, we return a local relative URL (this would need a static file mount in FastAPI)
        return f"/uploads/{file_path}"

    async def delete_file(self, file_path: str) -> bool:
        full_path = os.path.join(self.base_dir, file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

def get_storage_provider() -> StorageProvider:
    if settings.DEBUG or not settings.SUPABASE_URL or not HAS_SUPABASE:
        logger.info("Using LocalStorageProvider (Supabase unavailable)")
        return LocalStorageProvider()
    return SupabaseStorageProvider()

storage_service = get_storage_provider()
