from typing import Dict, Any, Optional
from .context import StepContext
import logging

logger = logging.getLogger(__name__)

class Step:
    """
    Motia Step: Single primitive for backend concerns.
    Combines Configuration and a Handler.
    """
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.config = config or {}

    async def execute(self, context: StepContext) -> StepContext:
        """
        Execute the step logic.
        Input: Context -> Processing -> Output: Updated Context.
        """
        logger.info(f"Executing Step: {self.name} [Doc1D: {context.document_1d}]")
        try:
            return await self._handle(context)
        except Exception as e:
            logger.error(f"Step {self.name} failed: {e}")
            raise e

    async def _handle(self, context: StepContext) -> StepContext:
        """Override this in subclasses"""
        raise NotImplementedError
