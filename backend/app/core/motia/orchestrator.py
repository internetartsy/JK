from typing import List
from .step import Step
from .context import StepContext
import logging

logger = logging.getLogger(__name__)

class MotiaOrchestrator:
    """
    Orchestrates the execution of a sequence of Steps.
    Maintains 'Thinkable' flow consistency using Document 1D.
    """
    def __init__(self, steps: List[Step]):
        self.steps = steps

    async def run(self, context: StepContext) -> StepContext:
        logger.info(f"--- Motia Workflow Started [Doc1D: {context.document_1d}] ---")
        
        for step in self.steps:
            context = await step.execute(context)
            
        logger.info(f"--- Motia Workflow Completed [Doc1D: {context.document_1d}] ---")
        return context
