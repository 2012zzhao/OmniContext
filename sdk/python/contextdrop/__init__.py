"""
ContextDrop Python SDK

用于与 ContextDrop 本地服务交互的客户端库
"""
from .client import Client, ContextDropError
from .models import Session, Memory, Message, SearchResult

__version__ = "0.1.0"
__all__ = ["Client", "Session", "Memory", "Message", "SearchResult", "ContextDropError"]
