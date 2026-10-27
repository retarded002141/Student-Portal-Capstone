from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from jose import jwt
from datetime import datetime, timedelta
from app.config import SECRET_KEY, ALGORITHM

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str):
    if not hashed_password:
        return False

    # Direct plain-text match check
    if plain_password == hashed_password:
        return True

    try:
        return pwd_context.verify(plain_password[:72], hashed_password)
    except (UnknownHashError, ValueError, TypeError):
        # Fallback for plain-text or invalid hash strings in database
        return plain_password == hashed_password


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=8)
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )