from pydantic import BaseModel


class LoginUser(BaseModel):
    student_number: str
    password: str