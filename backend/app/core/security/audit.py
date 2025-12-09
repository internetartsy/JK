import logging
from datetime import datetime
import json
import os

# Configure audit logger
audit_logger = logging.getLogger("audit_logger")
audit_logger.setLevel(logging.INFO)

# Create file handler for audit logs
log_dir = os.path.join(os.getcwd(), "logs")
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

file_handler = logging.FileHandler(os.path.join(log_dir, "security_audit.log"))
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
audit_logger.addHandler(file_handler)

def log_security_event(event_type: str, user_id: str, ip_address: str, details: dict):
    """
    Log a security-relevant event to the audit log.
    
    Args:
        event_type (str): The type of event (e.g., 'LOGIN_SUCCESS', 'UNAUTHORIZED_ACCESS', 'DATA_EXPORT')
        user_id (str): The ID of the acting user
        ip_address (str): The IP address of the request
        details (dict): Additional context about the event
    """
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "user_id": user_id,
        "ip_address": ip_address,
        "details": details
    }
    
    # Log structured JSON for easy parsing
    audit_logger.info(json.dumps(event))
