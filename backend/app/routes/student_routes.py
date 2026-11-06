# app/routes/student_routes.py
import os
import shutil
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Header, Body, UploadFile, File, BackgroundTasks
from jose import jwt, JWTError
from bson import ObjectId
from app.config import SECRET_KEY, ALGORITHM
from app.database import (
    users_collection,
    students_collection,
    schedules_collection,
    grades_collection,
    curriculums_collection,
    advising_collection,
    announcements_collection,
    studentsnotif_collection,
    database,
)
from app.utils.security import verify_password, hash_password
from app.utils.email_utils import send_otp_email

router = APIRouter()


def get_student_number_from_token(authorization: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        student_number = payload.get("student_number")
        if not student_number:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(student_number)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def format_minutes_to_time(minutes: int) -> str:
    if minutes is None:
        return "--"
    hours = minutes // 60
    mins = minutes % 60
    period = "AM" if hours < 12 else "PM"
    display_hour = hours % 12
    display_hour = 12 if display_hour == 0 else display_hour
    return f"{display_hour:02d}:{mins:02d} {period}"


def convert_percentage_to_number_grade(score) -> str:
    """BPC Official Number Grade scale conversion with object extraction."""
    if score is None or score == "" or score == "--":
        return "--"

    if isinstance(score, dict):
        if "value" in score and score["value"] is not None:
            score = score["value"]
        elif "grade" in score and score["grade"] is not None:
            score = score["grade"]
        elif "percentage" in score and score["percentage"] is not None:
            score = score["percentage"]
        elif "equivalent" in score and score["equivalent"] is not None:
            score = score["equivalent"]
        else:
            return "--"

    try:
        val = float(score)
    except (ValueError, TypeError):
        return "--"

    if val <= 5.0:
        return f"{val:.2f}"

    val_rounded = round(val)
    if val_rounded >= 99:
        return "1.00"
    elif val_rounded >= 96:
        return "1.25"
    elif val_rounded >= 93:
        return "1.50"
    elif val_rounded >= 90:
        return "1.75"
    elif val_rounded >= 87:
        return "2.00"
    elif val_rounded >= 84:
        return "2.25"
    elif val_rounded >= 81:
        return "2.50"
    elif val_rounded >= 77:
        return "2.75"
    elif val_rounded >= 75:
        return "3.00"
    else:
        return "5.00"


def format_term_label(sy_val, sem_val):
    sy_clean = str(sy_val or "").strip()
    sem_clean = str(sem_val or "").strip()
    if "Semester" in sy_clean:
        return sy_clean
    if sem_clean.lower() in ["1st", "1"]:
        sem_clean = "1st Semester"
    elif sem_clean.lower() in ["2nd", "2"]:
        sem_clean = "2nd Semester"
    elif "Semester" not in sem_clean and sem_clean:
        sem_clean = f"{sem_clean} Semester"
    return f"{sy_clean} {sem_clean}".strip()


# =======================================================
# 1. STUDENT PROFILE
# =======================================================
@router.get("/profile")
async def get_student_profile(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"studentNumber": int(student_num) if student_num.isdigit() else student_num}
        ]
    })

    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    first_name = student.get("firstName", "")
    middle_name = student.get("middleName", "")
    last_name = student.get("lastName", "")
    middle_initial = middle_name[0] if middle_name else ""
    full_name = f"{first_name} {middle_initial}. {last_name}".strip()

    perm_addr = f"{student.get('permanentHouse', '')} {student.get('permanentStreet', '')} {student.get('permanentBarangay', '')}, {student.get('permanentCity', '')}, {student.get('permanentProvince', '')}".strip()
    pres_addr = f"{student.get('presentHouse', '')} {student.get('presentStreet', '')} {student.get('presentBarangay', '')}, {student.get('presentCity', '')}, {student.get('presentProvince', '')}".strip()

    return {
        "student_number": str(student.get("studentNumber") or student.get("student_number")),
        "first_name": first_name,
        "last_name": last_name,
        "middle_initial": middle_initial,
        "year_level": f"{student.get('year', '1')}st Year" if str(student.get('year')) == '1' else f"{student.get('year', '1')}th Year",
        "section": student.get("section", "A"),
        "status": student.get("status", "Regular"),
        "email": student.get("email", ""),
        "avatar_url": student.get("avatar_url"),
        "personal_information": {
            "student_name": full_name,
            "civil_status": student.get("civilStatus", "Single"),
            "home_address": perm_addr or "Pulilan, Bulacan",
            "contact_no": student.get("contactNumber", "None"),
            "boarding_house_address": pres_addr or "None",
            "age": str(student.get("age", "21")),
            "religion": student.get("religion", "Roman Catholic"),
            "nationality": student.get("nationality", "Filipino"),
            "date_of_birth": student.get("birthDate", "N/A"),
            "place_of_birth": student.get("placeOfBirth", "N/A"),
            "father_name": student.get("fatherName", "None"),
            "father_occupation": "None",
            "father_tel_no": student.get("fatherContact", "None"),
            "mother_name": student.get("motherName", "None"),
            "mother_occupation": "None",
            "mother_tel_no": student.get("motherContact", "None"),
            "guardian": student.get("spouseName") or student.get("fatherName") or "None",
            "relation_to_guardian": "Spouse" if student.get("spouseName") else "Parent",
            "guardian_address": perm_addr or "None",
            "guardian_tel_no": student.get("fatherContact", "None")
        },
        "educational_background": {
            "elementary_school": student.get("elementarySchool", "None"),
            "elementary_location": student.get("elementaryAddress", "None"),
            "elementary_graduated": str(student.get("elementaryYear", "None")),
            "high_school": student.get("juniorHighSchool", "None"),
            "high_school_location": student.get("juniorHighAddress", "None"),
            "high_school_graduated": str(student.get("juniorHighYear", "None")),
            "senior_high_school": student.get("seniorHighSchool", "None"),
            "senior_high_location": student.get("seniorHighAddress", "None"),
            "senior_high_graduated": str(student.get("seniorHighYear", "None")),
            "college": student.get("collegeSchool") or "Baliwag Polytechnic College",
            "college_location": student.get("collegeAddress") or "Baliuag, Bulacan",
            "college_graduated": str(student.get("collegeYear") or "Pending")
        }
    }


# =======================================================
# 1.1 ENROLLED TERMS
# =======================================================
@router.get("/terms")
async def get_student_enrolled_terms(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    terms_set = set()

    archive_cursor = database["studentarchive"].find({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)}
        ]
    })
    
    async for rec in archive_cursor:
        sy = rec.get("schoolYear") or rec.get("school_year")
        sem = rec.get("semester")
        if sy and sem:
            terms_set.add(format_term_label(sy, sem))

    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"studentNumber": int(student_num) if student_num.isdigit() else student_num}
        ]
    })

    if student:
        sy = student.get("schoolYear") or student.get("school_year")
        sem = student.get("semester")
        if sy and sem:
            terms_set.add(format_term_label(sy, sem))

    if not terms_set and student:
        s_year = str(student.get("year", "1"))
        s_sec = str(student.get("section", "A")).replace("BSIT-", "").replace("BSIT", "").strip()
        s_sem = str(student.get("semester", "1st")).strip()
        s_sy = str(student.get("schoolYear", "2026-2027")).strip()

        matched_sched = await schedules_collection.find_one({
            "year": s_year,
            "semester": {"$regex": f"^{s_sem}", "$options": "i"},
            "$or": [
                {"section": student.get("section", "A")},
                {"section": s_sec},
                {"section": f"BSIT-{s_sec}"}
            ]
        })

        if matched_sched:
            sched_sy = matched_sched.get("academicYear") or matched_sched.get("schoolYear") or s_sy
            sched_sem = matched_sched.get("semester") or s_sem
            terms_set.add(format_term_label(sched_sy, sched_sem))

    if not terms_set:
        student_grades = await grades_collection.find({
            "$or": [{"student_id": str(student_num)}, {"student_id": int(student_num) if student_num.isdigit() else student_num}]
        }).to_list(length=100)
        
        for g in student_grades:
            raw_sy = g.get("academic_year") or g.get("schoolYear") or g.get("academicYear")
            raw_sem = g.get("semester")
            if raw_sy and raw_sem:
                terms_set.add(format_term_label(raw_sy, raw_sem))

    sorted_terms = sorted(list(terms_set), reverse=True)
    return {"terms": sorted_terms}


# =======================================================
# 2. CLASS SCHEDULE
# =======================================================
@router.get("/schedule")
async def get_student_schedule(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"studentNumber": int(student_num) if student_num.isdigit() else student_num}
        ]
    })

    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    student_year = str(student.get("year", "1"))
    student_section = str(student.get("section", "A"))
    student_sem = str(student.get("semester", "1st")).strip()
    student_sy = str(student.get("schoolYear", "2026-2027")).strip()

    curriculums = await curriculums_collection.find().to_list(length=100)
    subject_meta_map = {}
    for curr in curriculums:
        for subj in curr.get("subjects", []):
            code = subj.get("subject_code")
            if code:
                subject_meta_map[code.upper()] = {
                    "title": subj.get("title", code),
                    "units": subj.get("units", 3)
                }

    schedules_response = {}

    archive_cursor = database["studentarchive"].find({
        "studentNumber": str(student_num),
        "semester": {"$regex": f"^{student_sem}", "$options": "i"}
    })
    archive_records = await archive_cursor.to_list(length=100)

    for rec in archive_records:
        term_label = format_term_label(rec.get("schoolYear", student_sy), rec.get("semester", student_sem))

        subject_rows = []
        for cls in rec.get("classes", []):
            sub_code = cls.get("subjectCode", "").upper()
            meta = subject_meta_map.get(sub_code, {"title": sub_code, "units": 3})
            start_t = format_minutes_to_time(cls.get("startTime"))
            end_t = format_minutes_to_time(cls.get("endTime"))

            subject_rows.append({
                "code": sub_code,
                "title": meta["title"],
                "units": meta["units"],
                "room": cls.get("roomName") or cls.get("roomId") or "Room 1",
                "section": cls.get("sectionName") or f"BSIT {rec.get('year')}{rec.get('section')}",
                "schedule": f"{cls.get('day', 'Mon')} {start_t}–{end_t}",
                "prof": cls.get("profName", "--"),
                "email": f"{cls.get('profName', 'prof').lower().replace(' ', '.').replace(',', '')}@btech.ph.education"
            })

        schedules_response[term_label] = {
            "academic_year": term_label,
            "year_level": f"{rec.get('year', '1')}st Year",
            "subjects": subject_rows
        }

    if not schedules_response:
        clean_sec = student_section.replace("BSIT-", "").replace("BSIT", "").strip()
        query_schedule = await schedules_collection.find_one({
            "year": student_year,
            "semester": {"$regex": f"^{student_sem}", "$options": "i"},
            "$or": [
                {"section": student_section},
                {"section": clean_sec},
                {"section": f"BSIT-{clean_sec}"}
            ]
        })

        if query_schedule:
            term_label = format_term_label(student_sy, student_sem)
            subject_rows = []

            for cls in query_schedule.get("classes", []):
                sub_code = cls.get("subjectCode", "").upper()
                meta = subject_meta_map.get(sub_code, {"title": sub_code, "units": 3})
                start_t = format_minutes_to_time(cls.get("startTime"))
                end_t = format_minutes_to_time(cls.get("endTime"))

                subject_rows.append({
                    "code": sub_code,
                    "title": meta["title"],
                    "units": meta["units"],
                    "room": cls.get("roomName") or cls.get("roomId") or "Room 1",
                    "section": cls.get("sectionName") or f"BSIT {student_year}{student_section}",
                    "schedule": f"{cls.get('day', 'Mon')} {start_t}–{end_t}",
                    "prof": cls.get("profName", "--"),
                    "email": f"{cls.get('profName', 'prof').lower().replace(' ', '.').replace(',', '')}@btech.ph.education"
                })

            schedules_response[term_label] = {
                "academic_year": term_label,
                "year_level": f"{student_year}st Year",
                "subjects": subject_rows
            }

    return {"schedules": schedules_response}


# =======================================================
# 3. GRADES
# =======================================================
@router.get("/grades")
async def get_student_grades(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)

    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"studentNumber": int(student_num) if student_num.isdigit() else student_num}
        ]
    })

    student_grades = await grades_collection.find({
        "$or": [{"student_id": str(student_num)}, {"student_id": int(student_num) if student_num.isdigit() else student_num}]
    }).to_list(length=200)

    curriculums = await curriculums_collection.find().to_list(length=100)
    subject_meta_map = {}
    for curr in curriculums:
        for subj in curr.get("subjects", []):
            code = subj.get("subject_code")
            if code:
                subject_meta_map[code.upper()] = {
                    "title": subj.get("title", code),
                    "units": subj.get("units", 3)
                }

    grades_by_term = {}

    for g in student_grades:
        raw_sy = str(g.get("academic_year") or g.get("schoolYear") or g.get("academicYear") or (student.get("schoolYear") if student else "2026-2027")).strip()
        raw_sem = str(g.get("semester") or (student.get("semester") if student else "1st")).strip()

        computed = g.get("computedGrades", {})
        raw_snapshots = g.get("rawSnapshots", {})
        status_val = str(g.get("status") or raw_snapshots.get("status") or "").lower()
        equiv_val = str(computed.get("equivalent") or "").strip()
        sec_val = str(g.get("section") or "").upper()

        is_credited_subject = (
            equiv_val.lower() == "credited" or
            status_val == "credited" or
            sec_val == "TRANSFEREE" or
            raw_sy.lower() == "previous"
        )

        term_key = "Credited / Transferred Subjects" if is_credited_subject else format_term_label(raw_sy, raw_sem)

        extracted_code = g.get("subject_code") or g.get("subjectCode") or (g.get("section_id", "").split("-")[-1].upper() if "-" in g.get("section_id", "") else "SUBJECT")
        meta = subject_meta_map.get(extracted_code.upper(), {"title": extracted_code, "units": 3})

        def extract_grade_val(raw_obj, fallback_obj):
            if isinstance(raw_obj, dict):
                return raw_obj.get("value") or raw_obj.get("grade") or raw_obj.get("equivalent") or "--"
            if raw_obj is not None:
                return raw_obj
            if isinstance(fallback_obj, dict):
                return fallback_obj.get("value") or fallback_obj.get("grade") or fallback_obj.get("equivalent") or "--"
            return fallback_obj or "--"

        if is_credited_subject:
            final_grade_str = "Credited"
            prelim_str = "--"
            midterm_str = "--"
            prefinal_str = "--"
        else:
            prelim_val = extract_grade_val(computed.get("prelim"), g.get("prelim"))
            midterm_val = extract_grade_val(computed.get("midterm"), g.get("midterm") or g.get("rawMid"))
            prefinal_val = extract_grade_val(computed.get("prefinal"), g.get("prefinal") or g.get("rawPre"))
            final_val = extract_grade_val(computed.get("final"), g.get("final") or g.get("rawFinal"))

            if computed.get("equivalent") and equiv_val.replace('.', '', 1).isdigit():
                final_grade_str = f"{float(computed.get('equivalent')):.2f}"
            else:
                final_grade_str = convert_percentage_to_number_grade(final_val)

            prelim_str = convert_percentage_to_number_grade(prelim_val)
            midterm_str = convert_percentage_to_number_grade(midterm_val)
            prefinal_str = convert_percentage_to_number_grade(prefinal_val)

        row = {
            "code": extracted_code,
            "title": meta["title"],
            "units": meta["units"],
            "prelim": prelim_str,
            "midterm": midterm_str,
            "prefinal": prefinal_str,
            "final": final_grade_str,
            "equivalent": "Credited" if is_credited_subject else None,
            "status": "credited" if is_credited_subject else "enrolled",
            "prof": g.get("profName", "--"),
            "email": g.get("profEmail", "--")
        }

        if term_key not in grades_by_term:
            grades_by_term[term_key] = []
        grades_by_term[term_key].append(row)

    return {"grades": grades_by_term}


# =======================================================
# 4. RECORDS REQUESTS
# =======================================================
@router.get("/records")
@router.get("/records/")
async def get_student_records(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"username": str(student_num)}
        ]
    })
    
    if not student:
        return {"records_requests": []}

    reqs = student.get("record_requests", [])
    return {"records_requests": list(reversed(reqs))}


@router.post("/records/create")
async def create_student_record_request(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": str(student_num)},
            {"student_number": str(student_num)},
            {"username": str(student_num)}
        ]
    })

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    first_name = student.get("firstName") or student.get("first_name", "")
    last_name = student.get("lastName") or student.get("last_name", "")
    student_name = f"{first_name} {last_name}".strip() or f"Student {student_num}"

    doc_type = payload.get("documentType")
    year_sem = payload.get("yearSemester", "N/A")
    reason = payload.get("reason", "").strip()
    date_req = payload.get("dateRequested") or datetime.now().strftime("%B %d, %Y")

    if not doc_type:
        raise HTTPException(status_code=400, detail="Document type is required.")
    if not reason:
        raise HTTPException(status_code=400, detail="Reason for request is required.")

    new_request = {
        "id": str(ObjectId()),
        "studentNumber": str(student_num),
        "studentName": student_name,
        "documentType": doc_type,
        "yearSemester": year_sem,
        "reason": reason,
        "dateRequested": date_req,
        "status": "Pending",
        "createdAt": datetime.utcnow()
    }

    await students_collection.update_one(
        {"_id": student["_id"]},
        {"$push": {"record_requests": new_request}}
    )

    return {"message": "Request submitted successfully", "request": new_request}


@router.get("/records/all")
async def get_all_records_for_admin():
    admin_requests = []

    cursor = students_collection.find({
        "record_requests": {"$exists": True, "$not": {"$size": 0}}
    })

    async for student in cursor:
        s_num = student.get("studentNumber") or student.get("student_number", "")
        f_name = student.get("firstName") or student.get("first_name", "")
        l_name = student.get("lastName") or student.get("last_name", "")
        full_name = f"{f_name} {l_name}".strip() or f"Student {s_num}"

        req_list = student.get("record_requests", [])
        for idx, req in reversed(list(enumerate(req_list))):
            item = dict(req)
            item["requestIndex"] = idx
            item["studentNumber"] = str(s_num)
            item["studentName"] = full_name
            if "id" not in item:
                item["id"] = f"{s_num}_{idx}"
            admin_requests.append(item)

    admin_requests.sort(
        key=lambda x: str(x.get("createdAt", "") or x.get("dateRequested", "")),
        reverse=True
    )

    return {"requests": admin_requests}


@router.post("/records/status-update")
async def update_request_status(payload: dict = Body(...)):
    student_number = str(payload.get("studentNumber", ""))
    request_id = payload.get("requestId")
    request_idx = payload.get("requestIndex")
    new_status = payload.get("newStatus", "Pending")

    if not student_number or not new_status:
        raise HTTPException(status_code=400, detail="Missing required parameters.")

    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": student_number},
            {"student_number": student_number},
            {"studentNumber": int(student_number) if student_number.isdigit() else student_number}
        ]
    })

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    requests = student.get("record_requests", [])
    target_idx = -1

    for idx, r in enumerate(requests):
        r_id = str(r.get("id") or r.get("_id") or "")
        if (request_id and r_id == str(request_id)) or (request_idx is not None and idx == request_idx):
            target_idx = idx
            break

    if target_idx == -1:
        raise HTTPException(status_code=404, detail="Record request not found.")

    doc_type = requests[target_idx].get("documentType", "Document")
    requests[target_idx]["status"] = new_status
    requests[target_idx]["updatedAt"] = datetime.utcnow().isoformat()

    await students_collection.update_one(
        {"_id": student["_id"]},
        {"$set": {"record_requests": requests}}
    )

    if new_status.lower() == "ready for pickup":
        import uuid
        now_utc = datetime.utcnow()
        new_notification = {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "studentNumber": str(student_number),
            "title": "Document Request Ready for Pickup",
            "message": f"Your requested {doc_type} is now ready for pickup at the Registrar's Office.",
            "meta": "System | Records Request",
            "read": False,
            "link": "/Records_request",
            "createdAt": now_utc.isoformat()
        }
        await studentsnotif_collection.insert_one(new_notification)

    return {"message": f"Status updated to {new_status} and student notified."}


@router.get("/records/archived")
async def get_archived_requests():
    db = students_collection.database
    cursor = db["archived_requests"].find().sort("archivedAt", -1)
    archived_list = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("createdAt"), datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        if isinstance(doc.get("archivedAt"), datetime):
            doc["archivedAt"] = doc["archivedAt"].isoformat()
        archived_list.append(doc)

    return {"archived": archived_list}


@router.delete("/records/archived/delete/{archive_id}")
async def delete_archived_request(archive_id: str):
    db = students_collection.database
    
    result = await db["archived_requests"].delete_one({
        "$or": [
            {"id": archive_id},
            {"_id": ObjectId(archive_id) if ObjectId.is_valid(archive_id) else None}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Archived record not found.")
        
    return {"message": "Archived request permanently deleted."}


@router.post("/records/delete/{request_id}")
async def delete_student_record_request(
    request_id: str,
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    student = await students_collection.find_one({
        "$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]
    })

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    requests = student.get("record_requests", [])
    target_idx = -1
    target_req = None

    for idx, r in enumerate(requests):
        if str(r.get("id")) == str(request_id):
            target_idx = idx
            target_req = r
            break

    if target_idx == -1 or not target_req:
        raise HTTPException(status_code=404, detail="Request record not found.")

    if str(target_req.get("status", "")).strip().lower() != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled.")

    requests.pop(target_idx)
    await students_collection.update_one(
        {"_id": student["_id"]},
        {"$set": {"record_requests": requests}}
    )

    return {"message": "Request cancelled successfully"}


@router.post("/records/admin-delete")
async def delete_record_admin(payload: dict = Body(...)):
    s_num = str(payload.get("studentNumber", ""))
    req_id = payload.get("requestId")
    req_idx = payload.get("requestIndex")

    student = await students_collection.find_one({
        "$or": [{"studentNumber": s_num}, {"student_number": s_num}]
    })

    if student:
        requests = student.get("record_requests", [])
        target_idx = -1
        for idx, r in enumerate(requests):
            if (req_id and r.get("id") == req_id) or (req_idx is not None and idx == req_idx):
                target_idx = idx
                break

        if target_idx != -1:
            requests.pop(target_idx)
            await students_collection.update_one(
                {"_id": student["_id"]},
                {"$set": {"record_requests": requests}}
            )
            return {"message": "Deleted successfully"}

    return {"message": "Could not find record to delete"}


# =======================================================
# 5. NOTIFICATIONS (STUDENTSNOTIF COLLECTION)
# =======================================================
@router.get("/notifications")
async def get_student_notifications(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)

    cursor = studentsnotif_collection.find(
        {"studentNumber": str(student_num)}
    ).sort("createdAt", -1)
    
    notifs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "id" not in doc:
            doc["id"] = doc["_id"]
        notifs.append(doc)

    if len(notifs) == 0:
        return {"notifications": []}

    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    active_notifs = []
    expired_ids = []

    for n in notifs:
        created_at_raw = n.get("createdAt")
        if not created_at_raw:
            active_notifs.append(n)
            continue

        try:
            if isinstance(created_at_raw, datetime):
                dt_val = created_at_raw
            else:
                dt_val = datetime.fromisoformat(str(created_at_raw).replace("Z", "+00:00")).replace(tzinfo=None)

            if dt_val >= two_weeks_ago:
                active_notifs.append(n)
            else:
                expired_ids.append(n.get("id"))
        except Exception:
            active_notifs.append(n)

    if expired_ids:
        await studentsnotif_collection.delete_many({
            "$or": [
                {"id": {"$in": expired_ids}},
                {"_id": {"$in": [ObjectId(eid) for eid in expired_ids if ObjectId.is_valid(eid)]}}
            ]
        })

    return {"notifications": active_notifs}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    await studentsnotif_collection.update_many(
        {"studentNumber": str(student_num)},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read."}


@router.post("/notifications/read/{notif_id}")
async def mark_single_notification_read(
    notif_id: str,
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    
    query_conditions = [{"id": notif_id}]
    if ObjectId.is_valid(notif_id):
        query_conditions.append({"_id": ObjectId(notif_id)})

    await studentsnotif_collection.update_one(
        {
            "studentNumber": str(student_num),
            "$or": query_conditions
        },
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read."}


# =======================================================
# 6. AVATAR UPLOAD & REMOVE
# =======================================================
@router.post("/profile/avatar")
async def upload_avatar(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    base64_image = payload.get("avatar_base64")

    if not base64_image:
        raise HTTPException(status_code=400, detail="Missing avatar image data.")

    await students_collection.update_one(
        {"$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]},
        {"$set": {"avatar_url": base64_image}}
    )

    return {"message": "Avatar updated successfully", "avatar_url": base64_image}


@router.post("/profile/avatar/remove")
async def remove_avatar(authorization: str = Header(None)):
    student_num = get_student_number_from_token(authorization)
    await students_collection.update_one(
        {"$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]},
        {"$set": {"avatar_url": None}}
    )
    return {"message": "Avatar removed successfully", "avatar_url": None}


# =======================================================
# 7. SECURITY SETTINGS
# =======================================================
pending_otps = {}


@router.post("/profile/verify-password")
async def verify_student_password(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    provided_password = payload.get("password")

    if not provided_password:
        raise HTTPException(status_code=400, detail="Password is required.")

    user = await users_collection.find_one({"username": str(student_num)})
    if not user:
        user = await students_collection.find_one({
            "$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]
        })

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    stored_hash = user.get("password", "")
    is_valid = False
    try:
        is_valid = verify_password(provided_password, stored_hash)
    except Exception:
        is_valid = (provided_password == stored_hash)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect password.")

    return {"message": "Password verified."}


@router.post("/profile/send-email-otp")
async def request_email_change_otp(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    new_email = payload.get("new_email", "").strip()

    if not new_email:
        raise HTTPException(status_code=400, detail="New email address is required.")

    otp_code = str(random.randint(100000, 999999))
    pending_otps[str(student_num)] = {
        "email": new_email,
        "otp": otp_code
    }

    background_tasks.add_task(send_otp_email, new_email, otp_code)

    return {"message": "OTP verification code dispatched."}


@router.post("/profile/password")
async def update_password(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    old_password = payload.get("old_password")
    new_password = payload.get("new_password")

    user = await users_collection.find_one({"username": str(student_num)})
    if not user:
        user = await students_collection.find_one({
            "$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]
        })

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    stored_hash = user.get("password", "")
    is_valid = False
    try:
        is_valid = verify_password(old_password, stored_hash)
    except Exception:
        is_valid = (old_password == stored_hash)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect old password.")

    new_hash = hash_password(new_password)
    await users_collection.update_one({"username": str(student_num)}, {"$set": {"password": new_hash}})
    await students_collection.update_one(
        {"$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]},
        {"$set": {"password": new_hash}}
    )

    return {"message": "Password changed successfully."}


@router.post("/profile/email")
async def update_email(
    payload: dict = Body(...),
    authorization: str = Header(None)
):
    student_num = get_student_number_from_token(authorization)
    new_email = payload.get("email")
    user_otp = payload.get("otp", "").strip()

    if not new_email or not user_otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required.")

    stored_data = pending_otps.get(str(student_num))
    if not stored_data or stored_data.get("otp") != user_otp or stored_data.get("email") != new_email:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

    await students_collection.update_one(
        {"$or": [{"studentNumber": str(student_num)}, {"student_number": str(student_num)}]},
        {"$set": {"email": new_email}}
    )
    await users_collection.update_one({"username": str(student_num)}, {"$set": {"email": new_email}})

    pending_otps.pop(str(student_num), None)

    return {"message": "Email address updated successfully.", "email": new_email}


# =======================================================
# 8. PUBLIC ANNOUNCEMENTS
# =======================================================
@router.get("/announcements/all")
async def get_student_announcements(category: str = "iiti"):
    try:
        cursor = announcements_collection.find({
            "$or": [
                {"category": category},
                {"category": {"$exists": False}}
            ]
        })
        announcements = []
        async for doc in cursor:
            announcements.append({
                "id": str(doc["_id"]),
                "category": doc.get("category", category),
                "title": doc.get("title", ""),
                "description": doc.get("description", ""),
                "image": doc.get("image", ""),
                "date": doc.get("date", ""),
                "dateValue": doc.get("dateValue", ""),
                "published": doc.get("published", True),
            })
        return announcements
    except Exception:
        return []


# =======================================================
# 9. RECORDS CONFIGURATION & REASONS
# =======================================================
DEFAULT_DOCUMENTS = [
    "Certificate of Registration (COR)",
    "Certificate of Grades (COG)",
    "Transcript of Records (TOR)",
]

DEFAULT_REASONS = [
    "Scholarship Application / Renewal",
    "Employment",
    "Internship",
    "Licensure Application",
    "Transfer/Honorable Dismissal",
    "Personal Record",
]


@router.get("/records/reasons")
async def get_request_reasons():
    settings = await database["systemsettings"].find_one({"type": "request_reasons"})
    if not settings or "reasons" not in settings:
        return {"reasons": DEFAULT_REASONS}
    return {"reasons": settings["reasons"]}


@router.post("/records/reasons/update")
async def update_request_reasons(payload: dict = Body(...)):
    reasons_list = payload.get("reasons", [])
    if not isinstance(reasons_list, list):
        raise HTTPException(status_code=400, detail="Invalid data format.")
    
    cleaned_reasons = [str(r).strip() for r in reasons_list if str(r).strip() and str(r).strip() != "Others (Please specify)"]

    await database["systemsettings"].update_one(
        {"type": "request_reasons"},
        {"$set": {"reasons": cleaned_reasons, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    return {"message": "Reasons updated successfully.", "reasons": cleaned_reasons}


@router.get("/records/config")
async def get_records_config():
    doc_settings = await database["systemsettings"].find_one({"type": "request_documents"})
    reason_settings = await database["systemsettings"].find_one({"type": "request_reasons"})

    docs = doc_settings.get("documents", DEFAULT_DOCUMENTS) if doc_settings else DEFAULT_DOCUMENTS
    reasons = reason_settings.get("reasons", DEFAULT_REASONS) if reason_settings else DEFAULT_REASONS

    return {"documents": docs, "reasons": reasons}


@router.post("/records/config/update")
async def update_records_config(payload: dict = Body(...)):
    docs_list = payload.get("documents")
    reasons_list = payload.get("reasons")

    if docs_list is not None:
        custom_docs = [str(d).strip() for d in docs_list if str(d).strip()]
        for req_doc in DEFAULT_DOCUMENTS:
            if req_doc not in custom_docs:
                custom_docs.insert(0, req_doc)

        await database["systemsettings"].update_one(
            {"type": "request_documents"},
            {"$set": {"documents": custom_docs, "updatedAt": datetime.utcnow()}},
            upsert=True
        )

    if reasons_list is not None:
        cleaned_reasons = [str(r).strip() for r in reasons_list if str(r).strip() and str(r).strip() != "Others (Please specify)"]

        await database["systemsettings"].update_one(
            {"type": "request_reasons"},
            {"$set": {"reasons": cleaned_reasons, "updatedAt": datetime.utcnow()}},
            upsert=True
        )

    return {"message": "Request configurations updated successfully."}


pending_password_resets = {}


# =======================================================
# 10. ACCOUNT RECOVERY / FORGOT PASSWORD
# =======================================================
@router.post("/forgot-password/request")
async def request_password_reset_otp(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...)
):
    identifier = payload.get("identifier", "").strip()

    if not identifier:
        raise HTTPException(status_code=400, detail="Student Number or Email address is required.")

    student = await students_collection.find_one({
        "$or": [
            {"studentNumber": identifier},
            {"student_number": identifier},
            {"email": identifier}
        ]
    })

    if not student:
        raise HTTPException(status_code=404, detail="No student record matching the provided details was found.")

    student_email = student.get("email")
    student_num = str(student.get("studentNumber") or student.get("student_number"))

    if not student_email:
        raise HTTPException(status_code=400, detail="No registered email address found for this account.")

    otp_code = str(random.randint(100000, 999999))
    pending_password_resets[student_num] = {
        "email": student_email,
        "otp": otp_code
    }

    from app.utils.email_utils import send_password_reset_email
    background_tasks.add_task(send_password_reset_email, student_email, otp_code)

    email_parts = student_email.split("@")
    masked_local = email_parts[0][0] + "***" + email_parts[0][-1] if len(email_parts[0]) > 2 else email_parts[0][0] + "***"
    masked_email = f"{masked_local}@{email_parts[1]}"

    return {
        "message": "Password reset OTP dispatched.",
        "student_number": student_num,
        "masked_email": masked_email
    }


@router.post("/forgot-password/verify-otp")
async def verify_password_reset_otp(payload: dict = Body(...)):
    student_num = payload.get("student_number", "").strip()
    user_otp = payload.get("otp", "").strip()

    if not student_num or not user_otp:
        raise HTTPException(status_code=400, detail="Student number and OTP code are required.")

    stored_data = pending_password_resets.get(student_num)
    if not stored_data or stored_data.get("otp") != user_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    return {"message": "OTP verified successfully.", "student_number": student_num}


@router.post("/forgot-password/reset")
async def reset_student_password(payload: dict = Body(...)):
    student_num = payload.get("student_number", "").strip()
    user_otp = payload.get("otp", "").strip()
    new_password = payload.get("new_password", "").strip()

    if not student_num or not user_otp or not new_password:
        raise HTTPException(status_code=400, detail="Student number, OTP, and new password are required.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    stored_data = pending_password_resets.get(student_num)
    if not stored_data or stored_data.get("otp") != user_otp:
        raise HTTPException(status_code=400, detail="Authorization session expired or invalid OTP.")

    new_hash = hash_password(new_password)

    await users_collection.update_one({"username": student_num}, {"$set": {"password": new_hash}})
    await students_collection.update_one(
        {"$or": [{"studentNumber": student_num}, {"student_number": student_num}]},
        {"$set": {"password": new_hash}}
    )

    pending_password_resets.pop(student_num, None)

    return {"message": "Password reset successful! You can now log in with your new password."}