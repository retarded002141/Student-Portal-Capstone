from fastapi import APIRouter, HTTPException, Body
from app.models.user_model import LoginUser
from app.database import users_collection, students_collection
from app.utils.security import verify_password, create_access_token, hash_password

router = APIRouter()


@router.post("/login")
async def login(user: LoginUser):
    student_num = user.student_number.strip()
    plain_pass = user.password.strip()

    # 1. Lookup student authentication credentials in users collection
    db_user = await users_collection.find_one({"username": student_num})

    if not db_user:
        # Fallback check against students collection if username is studentNumber
        db_student = await students_collection.find_one({
            "$or": [
                {"studentNumber": student_num},
                {"student_number": student_num}
            ]
        })
        
        if db_student:
            stored_pass = db_student.get("password", "")
            if verify_password(plain_pass, stored_pass):
                target_num = db_student.get("studentNumber") or db_student.get("student_number")
                token = create_access_token({
                    "student_number": target_num,
                    "role": "student"
                })
                return {
                    "message": "Login successful",
                    "token": token,
                    "role": "student",
                    "student_number": target_num,
                    "first_name": db_student.get("firstName") or db_student.get("first_name", "Student"),
                    "last_name": db_student.get("lastName") or db_student.get("last_name", "")
                }

        raise HTTPException(
            status_code=401,
            detail="Invalid student number or password"
        )

    # 2. Verify password for users collection match
    stored_pass = db_user.get("password", "")
    if not verify_password(plain_pass, stored_pass):
        raise HTTPException(
            status_code=401,
            detail="Invalid student number or password"
        )

    # 3. Pull first and last name from students collection
    student_profile = await students_collection.find_one({
        "$or": [
            {"studentNumber": student_num},
            {"student_number": student_num}
        ]
    })
    
    first_name = student_profile.get("firstName") or student_profile.get("first_name", "Student") if student_profile else "Student"
    last_name = student_profile.get("lastName") or student_profile.get("last_name", "") if student_profile else ""

    token = create_access_token({
        "student_number": db_user.get("username"),
        "role": db_user.get("role", "student")
    })

    return {
        "message": "Login successful",
        "token": token,
        "role": db_user.get("role", "student"),
        "student_number": db_user.get("username"),
        "first_name": first_name,
        "last_name": last_name
    }


@router.post("/verify-email")
async def verify_email_lookup(payload: dict = Body(...)):
    email_input = payload.get("email", "").strip()
    if not email_input:
        raise HTTPException(status_code=400, detail="Email parameter required.")

    matched_student = await students_collection.find_one({"email": email_input})
    if not matched_student:
        matched_student = await users_collection.find_one({"email": email_input})

    if not matched_student:
        raise HTTPException(
            status_code=404,
            detail="This email address is not registered to any student account."
        )

    target_number = matched_student.get("studentNumber") or matched_student.get("student_number") or matched_student.get("username")

    return {
        "message": "Account target identified.",
        "student_number": target_number
    }


@router.post("/reset-password")
async def reset_recovery_password(payload: dict = Body(...)):
    student_number = payload.get("student_number")
    new_password = payload.get("new_password")

    if not student_number or not new_password:
        raise HTTPException(status_code=400, detail="Missing processing validation metrics.")

    hashed_password = hash_password(new_password)

    await users_collection.update_one(
        {"username": student_number},
        {"$set": {"password": hashed_password}}
    )
    await students_collection.update_one(
        {"$or": [{"studentNumber": student_number}, {"student_number": student_number}]},
        {"$set": {"password": hashed_password}}
    )

    return {"message": "Credentials updated cleanly."}