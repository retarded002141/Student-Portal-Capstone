import os
import requests
from fastapi import HTTPException


def send_otp_email(recipient_email: str, otp_code: str):
    """Sends an OTP verification code for Email Change via Resend HTTPS REST API."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()

    if not api_key:
        print("\n[ERROR] RESEND_API_KEY is missing from environment variables.\n")
        raise HTTPException(
            status_code=500,
            detail="Email service configuration missing on server."
        )

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8faf8; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2e522a; margin-top: 0;">Email Change Request</h2>
          <p style="color: #475569; font-size: 14px;">Verification code requested for <strong>{recipient_email}</strong>:</p>
          <div style="text-align: center; background: #e4f6e2; padding: 14px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2e522a;">{otp_code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">If you did not request this change, please ignore this email.</p>
        </div>
      </body>
    </html>
    """

    payload = {
        "from": "Student Portal <onboarding@resend.dev>",
        "to": [recipient_email],
        "subject": f"{otp_code} is your Student Portal Verification Code",
        "html": html_content,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code in (200, 201):
            print(f"\n[HTTP SUCCESS] Dispatched OTP {otp_code} to {recipient_email} via Resend API\n")
        else:
            print(f"\n[HTTP ERROR] Status {response.status_code}: {response.text}\n")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send email to {recipient_email}. (Resend free accounts can only send to registered owner emails unless a domain is verified)."
            )
    except requests.RequestException as e:
        print(f"\n[HTTP NETWORK ERROR] Failed to connect to Resend API: {e}\n")
        raise HTTPException(
            status_code=502,
            detail="Failed to reach email verification service."
        )


def send_password_reset_email(recipient_email: str, otp_code: str):
    """Sends a Password Reset OTP verification code via Resend HTTPS REST API."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()

    if not api_key:
        print("\n[ERROR] RESEND_API_KEY is missing from environment variables.\n")
        raise HTTPException(
            status_code=500,
            detail="Email service configuration missing on server."
        )

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8faf8; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2e522a; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 14px;">Use the verification code below to reset your Student Portal account password for <strong>{recipient_email}</strong>:</p>
          <div style="text-align: center; background: #e4f6e2; padding: 14px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2e522a;">{otp_code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">If you did not request a password reset, please secure your account immediately.</p>
        </div>
      </body>
    </html>
    """

    payload = {
        "from": "Student Portal <onboarding@resend.dev>",
        "to": [recipient_email],
        "subject": f"{otp_code} is your Password Reset Code",
        "html": html_content,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code in (200, 201):
            print(f"\n[HTTP SUCCESS] Dispatched Password Reset OTP {otp_code} to {recipient_email} via Resend API\n")
        else:
            print(f"\n[HTTP ERROR] Status {response.status_code}: {response.text}\n")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send email to {recipient_email}."
            )
    except requests.RequestException as e:
        print(f"\n[HTTP NETWORK ERROR] Failed to connect to Resend API: {e}\n")
        raise HTTPException(
            status_code=502,
            detail="Failed to reach email verification service."
        )