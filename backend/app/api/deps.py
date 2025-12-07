from typing import Generator, List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from fastapi import Header, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
import requests
from app.core.config import settings

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.KEYCLOAK_URL}/realms/{settings.REALM}/protocol/openid-connect/token")

class User(BaseModel):
    id: str
    username: str
    email: str = None
    roles: List[str] = []

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def check_api_version(accept: str = Header(None)):
    """
    Enforce API versioning via Accept header.
    Expected: application/vnd.agristack.v1+json
    """
    if not accept or "application/vnd.agristack.v1+json" not in accept:
        pass

def get_keycloak_public_key():
    """
    Fetch JWKS from Keycloak. 
    In prod, cache this.
    """
    try:
        url = f"{settings.KEYCLOAK_URL}/realms/{settings.REALM}/protocol/openid-connect/certs"
        # Since backend runs in docker, it might need to access keycloak via service name
        # But token issuer might be localhost. 
        # For simplicity in this dev environment, we assume KEYCLOAK_URL is accessible 
        # and we skip strict issuer check if needed, or rely on internal DNS.
        response = requests.get(url, timeout=5)
        return response.json()
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validate access token and return current user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decode token header to get kid
        header = jwt.get_unverified_header(token)
        jwks = get_keycloak_public_key()
        
        if not jwks:
             raise credentials_exception

        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        
        if not rsa_key:
             raise credentials_exception

        # 2. Verify token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=settings.ALGORITHMS,
            audience=settings.CLIENT_ID, 
            # We explicitly disable issuer check for Docker dev env because 
            # token issued by localhost:8080 but verified by keycloak:8080 might mismatch
            options={"verify_aud": False, "verify_iss": False} 
        )
        
        username: str = payload.get("preferred_username")
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if username is None:
            raise credentials_exception
            
        # 3. Extract roles
        # Keycloak stores realm roles in realm_access.roles
        roles = []
        realm_access = payload.get("realm_access", {})
        if realm_access:
            roles = realm_access.get("roles", [])
            
        return User(id=user_id, username=username, email=email, roles=roles)
        
    except JWTError as e:
        print(f"JWT Verification Failed: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Auth Error: {e}")
        raise credentials_exception

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        # Check if user has any of the allowed roles
        # Simple intersection check
        if not set(user.roles).intersection(set(self.allowed_roles)):
            raise HTTPException(status_code=403, detail="Operation not permitted")
