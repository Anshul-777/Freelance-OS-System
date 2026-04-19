from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Workspace, UserWorkspace
from auth import get_current_user
from typing import Optional

async def get_current_workspace(
    x_workspace_id: Optional[int] = Header(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Workspace:
    """
    Dependency to get the current workspace from X-Workspace-Id header.
    Validates that the current user has access to this workspace.
    """
    if not x_workspace_id:
        # If no workspace header, check if user has any workspaces and return the first one
        workspace = db.query(Workspace).join(UserWorkspace).filter(UserWorkspace.user_id == current_user.id).first()
        if not workspace:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User has no workspace. Please create one."
            )
        return workspace

    # Validate workspace access
    workspace = db.query(Workspace).join(UserWorkspace).filter(
        Workspace.id == x_workspace_id,
        UserWorkspace.user_id == current_user.id
    ).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace."
        )

    return workspace
