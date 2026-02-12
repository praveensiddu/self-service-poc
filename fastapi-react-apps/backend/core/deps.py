import os
from fastapi import HTTPException, Request

def get_current_user(request: Request ):
    headers = request.headers
    userid = (
        headers.get("x-user")
        or headers.get("x-userid")
        or headers.get("x-remote-user")
        or headers.get("remote-user")
        or headers.get("x-auth-request-user")
        or os.getenv("CURRENT_USER")
        or "unknown"
    )
    return str(userid)

