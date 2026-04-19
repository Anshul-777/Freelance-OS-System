from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models import User, Workspace, UserWorkspace
from schemas import LoginRequest, TokenResponse, UserResponse, UserCreate, UserUpdate
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_password_hash
)
from config import settings
from services.email_service import send_welcome_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists"
        )

    # Create user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        company_name=user_in.company_name,
        currency=user_in.currency,
        hourly_rate=user_in.hourly_rate,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Default Workspace
    workspace_name = new_user.company_name or f"{new_user.full_name}'s Workspace"
    import re
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', workspace_name.lower()).strip('-')
    
    new_workspace = Workspace(
        name=workspace_name,
        slug=f"{slug}-{new_user.id}",
        owner_id=new_user.id
    )
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)

    # Join the workspace
    user_workspace = UserWorkspace(
        user_id=new_user.id,
        workspace_id=new_workspace.id,
        role="owner"
    )
    db.add(user_workspace)
    db.commit()

    # Load workspaces for response  
    new_user.workspaces = db.query(Workspace).join(UserWorkspace).filter(
        UserWorkspace.user_id == new_user.id
    ).all()

    # Send welcome email in the background
    background_tasks.add_task(send_welcome_email, new_user.email, new_user.full_name)

    # Generate token
    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Load workspaces eagerly for response
    user.workspaces = db.query(Workspace).join(UserWorkspace).filter(
        UserWorkspace.user_id == user.id
    ).all()
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Eagerly load workspaces
    from sqlalchemy.orm import joinedload
    current_user = db.query(User).options(
        joinedload(User.workspaces)
    ).filter(User.id == current_user.id).first()
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    # Load workspaces
    from sqlalchemy.orm import joinedload
    current_user = db.query(User).options(
        joinedload(User.workspaces)
    ).filter(User.id == current_user.id).first()
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from auth import verify_password
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "Password changed successfully"}
