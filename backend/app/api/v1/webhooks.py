from fastapi import APIRouter, Request, HTTPException
import logging
from typing import Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/alert")
async def receive_alert(request: Request):
    """
    Endpoint to receive alerts from Alertmanager.
    """
    try:
        payload = await request.json()
        
        # Log the alerts
        alerts = payload.get('alerts', [])
        for alert in alerts:
            status = alert.get('status')
            labels = alert.get('labels', {})
            annotations = alert.get('annotations', {})
            
            logger.info(
                f"Received Alert: Status={status}, "
                f"AlertName={labels.get('alertname')}, "
                f"Severity={labels.get('severity')}, "
                f"Description={annotations.get('description')}"
            )
            
        return {"status": "success", "message": "Alerts received"}
        
    except Exception as e:
        logger.error(f"Error processing alert webhook: {str(e)}")
        raise HTTPException(status_code=422, detail="Invalid payload")
