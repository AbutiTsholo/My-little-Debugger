from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from .config import settings
from .ai import ChatContext, ChatFinding, ChatTurn, get_assistant_provider
from .analyzer import analyze_source
from .db import Base, SessionLocal, engine, get_db
from .models import AnalysisRun, AuditLog, ChatMessageModel, ChatSession, ErrorFindingModel, Project, Report, UploadedFile, User
from .queue import enqueue_analysis
from .schemas import (
    AnalysisJobOut,
    AnalysisResult,
    AnalysisSummary,
    AuditLogOut,
    AuthResponse,
    ChatMessageCreate,
    ChatMessageOut,
    ChatSessionCreate,
    ChatSessionMessageCreate,
    ChatSessionMessageOut,
    ChatSessionOut,
    ErrorFinding,
    FileOut,
    FileUploadMeta,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    ReportCreate,
    ReportOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserProfileUpdate,
    UserRoleOut,
)
from .utils import create_access_token, decode_access_token, hash_password, verify_password

app = FastAPI(title=settings.app_name)


def seed_demo_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.demo_admin_email.lower()).first()
        if not existing:
            db.add(
                User(
                    name=settings.demo_admin_email.split("@")[0],
                    email=settings.demo_admin_email.lower(),
                    password_hash=hash_password(settings.demo_admin_password),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    seed_demo_admin()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        user_id = decode_access_token(token)
    except ValueError as error:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from error

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def record_audit(
    db: Session,
    user_id: int | None,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    details: str | None = None,
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    ))


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}


@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.flush()
    record_audit(db, user.id, "user.registered", "user", user.id)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserOut(id=user.id, name=user.name, email=user.email, role=user.role),
    )


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    record_audit(db, user.id, "user.logged_in", "user", user.id)
    db.commit()
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserOut(id=user.id, name=user.name, email=user.email, role=user.role),
    )


@app.get("/api/v1/auth/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
    )


@app.post("/api/v1/auth/logout")
def logout_user(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return {"message": "Logged out successfully"}


@app.get("/api/v1/users/me/role", response_model=UserRoleOut)
def get_current_user_role(current_user: User = Depends(get_current_user)):
    return UserRoleOut(role=current_user.role)


@app.patch("/api/v1/users/me/profile", response_model=UserOut)
def update_current_user_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        normalized_email = payload.email.lower()
        existing = db.query(User).filter(User.email == normalized_email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        current_user.email = normalized_email

    db.commit()
    db.refresh(current_user)
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
    )


@app.patch("/api/v1/users/{user_id}/profile", response_model=UserOut)
def update_user_profile(
    user_id: int,
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot update another user")
    return update_current_user_profile(payload=payload, db=db, current_user=current_user)


@app.get("/api/v1/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access another user")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=user.id, name=user.name, email=user.email, role=user.role)


@app.post("/api/v1/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(name=payload.name, description=payload.description, owner_id=current_user.id)
    db.add(project)
    db.flush()
    record_audit(db, current_user.id, "project.created", "project", project.id)
    db.commit()
    db.refresh(project)
    return ProjectOut(id=project.id, name=project.name, description=project.description, owner_id=project.owner_id)


@app.get("/api/v1/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    return [
        ProjectOut(id=project.id, name=project.name, description=project.description, owner_id=project.owner_id)
        for project in projects
    ]


@app.get("/api/v1/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut(id=project.id, name=project.name, description=project.description, owner_id=project.owner_id)


@app.patch("/api/v1/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    db.refresh(project)
    return ProjectOut(id=project.id, name=project.name, description=project.description, owner_id=project.owner_id)


@app.post("/api/v1/projects/{project_id}/files", response_model=FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(project_id: int, payload: FileUploadMeta, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    storage_path = f"uploads/{current_user.id}/{project_id}/{payload.filename}"
    file_record = UploadedFile(
        project_id=project_id,
        filename=payload.filename,
        language=payload.language,
        storage_path=storage_path,
        status="uploaded",
        content=payload.content,
    )
    db.add(file_record)
    db.flush()
    record_audit(db, current_user.id, "file.uploaded", "file", file_record.id, file_record.filename)
    db.commit()
    db.refresh(file_record)

    return FileOut(
        id=file_record.id,
        project_id=file_record.project_id,
        filename=file_record.filename,
        language=file_record.language,
        status=file_record.status,
        storage_path=file_record.storage_path,
        content=file_record.content,
    )


@app.get("/api/v1/projects/{project_id}/files", response_model=list[FileOut])
def list_files(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(UploadedFile).filter(UploadedFile.project_id == project_id).all()
    return [
        FileOut(
            id=file.id,
            project_id=file.project_id,
            filename=file.filename,
            language=file.language,
            status=file.status,
            storage_path=file.storage_path,
            content=file.content,
        )
        for file in files
    ]


def process_analysis(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if not run:
            return
        file_record = db.query(UploadedFile).filter(UploadedFile.id == run.file_id).first()
        if not file_record:
            run.status = "failed"
            run.result_summary = "Source file not found"
            db.commit()
            return

        findings = [
            ErrorFindingModel(
                run_id=run.id,
                line=finding.line,
                message=finding.message,
                suggestion=finding.suggestion,
                severity=finding.severity,
            )
            for finding in analyze_source(file_record.content, file_record.language)
        ]

        run.status = "completed"
        run.result_summary = f"Detected {len(findings)} issues" if findings else "No issues detected"
        db.add_all(findings)
        db.commit()
    except Exception:
        db.rollback()
        run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.result_summary = "Analysis failed"
            db.commit()
    finally:
        db.close()


@app.get("/api/v1/files/{file_id}", response_model=FileOut)
def get_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(UploadedFile).join(Project).filter(
        UploadedFile.id == file_id,
        Project.owner_id == current_user.id,
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return FileOut(
        id=file_record.id,
        project_id=file_record.project_id,
        filename=file_record.filename,
        language=file_record.language,
        status=file_record.status,
        storage_path=file_record.storage_path,
        content=file_record.content,
    )


@app.delete("/api/v1/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(UploadedFile).join(Project).filter(
        UploadedFile.id == file_id,
        Project.owner_id == current_user.id,
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    runs = db.query(AnalysisRun).filter(AnalysisRun.file_id == file_id).all()
    for run in runs:
        db.query(ErrorFindingModel).filter(ErrorFindingModel.run_id == run.id).delete()
        db.delete(run)
    db.delete(file_record)
    db.commit()


@app.post("/api/v1/analysis/run", response_model=AnalysisJobOut)
def run_analysis(
    file_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_record = db.query(UploadedFile).join(Project).filter(UploadedFile.id == file_id, Project.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    run = AnalysisRun(file_id=file_id, status="pending", result_summary="Analysis queued")
    db.add(run)
    db.commit()
    db.refresh(run)
    if settings.use_queue:
        try:
            enqueue_analysis(run.id)
        except RedisError:
            background_tasks.add_task(process_analysis, run.id)
    else:
        background_tasks.add_task(process_analysis, run.id)

    return AnalysisJobOut(id=run.id, file_id=file_id, status=run.status, result_summary=run.result_summary)


@app.get("/api/v1/analysis/jobs/{job_id}", response_model=AnalysisJobOut)
def get_analysis_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(AnalysisRun).join(UploadedFile).join(Project).filter(AnalysisRun.id == job_id, Project.owner_id == current_user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return AnalysisJobOut(id=run.id, file_id=run.file_id, status=run.status, result_summary=run.result_summary)


@app.get("/api/v1/files/{file_id}/errors", response_model=AnalysisResult)
def get_file_errors(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(UploadedFile).join(Project).filter(UploadedFile.id == file_id, Project.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    run = db.query(AnalysisRun).filter(AnalysisRun.file_id == file_id).order_by(AnalysisRun.id.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No analysis run found for this file")

    findings = db.query(ErrorFindingModel).filter(ErrorFindingModel.run_id == run.id).all()
    mapped = [
        ErrorFinding(
            line=f.line,
            message=f.message,
            suggestion=f.suggestion,
            severity=f.severity,
        )
        for f in findings
    ]

    return AnalysisResult(
        file_id=file_id,
        language=file_record.language,
        error_count=len(mapped),
        status=run.status,
        errors=mapped,
    )


@app.get("/api/v1/files/{file_id}/error-summary", response_model=AnalysisSummary)
def get_file_error_summary(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(UploadedFile).join(Project).filter(
        UploadedFile.id == file_id,
        Project.owner_id == current_user.id,
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    run = db.query(AnalysisRun).filter(AnalysisRun.file_id == file_id).order_by(AnalysisRun.id.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No analysis run found for this file")

    error_count = db.query(ErrorFindingModel).filter(ErrorFindingModel.run_id == run.id).count()
    return AnalysisSummary(
        file_id=file_id,
        language=file_record.language,
        status=run.status,
        error_count=error_count,
        summary=run.result_summary,
    )


@app.get("/api/v1/admin/users", response_model=list[UserOut])
def admin_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserOut(id=user.id, name=user.name, email=user.email, role=user.role)
        for user in users
    ]


@app.get("/api/v1/admin/summary")
def admin_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user_count = db.query(User).count()
    project_count = db.query(Project).count()
    file_count = db.query(UploadedFile).count()
    return {"user_count": user_count, "project_count": project_count, "file_count": file_count}


@app.get("/api/v1/admin/audit-logs", response_model=list[AuditLogOut])
def admin_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(50).all()
    return [AuditLogOut(
        id=log.id,
        user_id=log.user_id,
        action=log.action,
        resource_type=log.resource_type,
        resource_id=log.resource_id,
        details=log.details,
    ) for log in logs]


@app.post("/api/v1/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(UploadedFile).join(Project).filter(
        UploadedFile.id == payload.file_id,
        Project.owner_id == current_user.id,
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    report = Report(
        user_id=current_user.id,
        file_id=payload.file_id,
        title=payload.title,
        content=payload.content,
    )
    db.add(report)
    db.flush()
    record_audit(db, current_user.id, "report.created", "report", report.id)
    db.commit()
    db.refresh(report)
    return ReportOut(id=report.id, user_id=report.user_id, file_id=report.file_id, title=report.title, content=report.content)


@app.get("/api/v1/reports", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.id.desc()).all()
    return [ReportOut(id=report.id, user_id=report.user_id, file_id=report.file_id, title=report.title, content=report.content) for report in reports]


@app.get("/api/v1/reports/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut(id=report.id, user_id=report.user_id, file_id=report.file_id, title=report.title, content=report.content)


@app.get("/api/v1/reports/{report_id}/export")
def export_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(
        content=report.content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="report-{report.id}.json"'},
    )



def get_owned_chat_session(session_id: int, db: Session, current_user: User) -> ChatSession:
    chat_session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat_session


def get_chat_context(file_id: int | None, db: Session, current_user: User) -> ChatContext | None:
    if file_id is None:
        return None
    file_record = db.query(UploadedFile).join(Project).filter(
        UploadedFile.id == file_id,
        Project.owner_id == current_user.id,
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    latest_run = db.query(AnalysisRun).filter(
        AnalysisRun.file_id == file_record.id,
    ).order_by(AnalysisRun.id.desc()).first()
    finding_records = db.query(ErrorFindingModel).filter(
        ErrorFindingModel.run_id == latest_run.id,
    ).order_by(ErrorFindingModel.line.asc()).all() if latest_run else []
    return ChatContext(
        file_id=file_record.id,
        filename=file_record.filename,
        language=file_record.language,
        finding_count=len(finding_records),
        content=file_record.content[:4000],
        findings=[
            ChatFinding(line=finding.line, message=finding.message, suggestion=finding.suggestion)
            for finding in finding_records
        ],
        analysis_status=latest_run.status if latest_run else None,
    )


@app.post("/api/v1/chat/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.file_id is not None:
        get_chat_context(payload.file_id, db, current_user)
    chat_session = ChatSession(user_id=current_user.id, file_id=payload.file_id, title=payload.title)
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)
    return ChatSessionOut(id=chat_session.id, title=chat_session.title, file_id=chat_session.file_id)


@app.get("/api/v1/chat/sessions", response_model=list[ChatSessionOut])
def list_chat_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
    ).order_by(ChatSession.id.desc()).all()
    return [ChatSessionOut(id=item.id, title=item.title, file_id=item.file_id) for item in sessions]


@app.get("/api/v1/chat/sessions/{session_id}", response_model=ChatSessionOut)
def get_chat_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chat_session = get_owned_chat_session(session_id, db, current_user)
    return ChatSessionOut(id=chat_session.id, title=chat_session.title, file_id=chat_session.file_id)


@app.get("/api/v1/chat/sessions/{session_id}/messages", response_model=list[ChatSessionMessageOut])
def list_chat_messages(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chat_session = get_owned_chat_session(session_id, db, current_user)
    return [
        ChatSessionMessageOut(id=item.id, session_id=session_id, role=item.role, message=item.message)
        for item in db.query(ChatMessageModel).filter(
            ChatMessageModel.session_id == chat_session.id,
        ).order_by(ChatMessageModel.id.asc()).all()
    ]


@app.post("/api/v1/chat/sessions/{session_id}/messages", response_model=ChatSessionMessageOut, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    session_id: int,
    payload: ChatSessionMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_session = get_owned_chat_session(session_id, db, current_user)
    context = get_chat_context(chat_session.file_id, db, current_user)
    history = [
        ChatTurn(role=item.role, message=item.message)
        for item in db.query(ChatMessageModel).filter(
            ChatMessageModel.session_id == chat_session.id,
        ).order_by(ChatMessageModel.id.asc()).all()
    ]
    user_message = ChatMessageModel(session_id=session_id, role="user", message=payload.message)
    db.add(user_message)
    assistant_message = get_assistant_provider().respond(
        payload.message,
        context,
        history,
        payload.explanation_mode,
    )
    db.add(ChatMessageModel(session_id=session_id, role="assistant", message=assistant_message))
    db.commit()
    db.refresh(user_message)
    assistant_record = db.query(ChatMessageModel).filter(
        ChatMessageModel.session_id == session_id,
        ChatMessageModel.role == "assistant",
    ).order_by(ChatMessageModel.id.desc()).first()
    return ChatSessionMessageOut(
        id=assistant_record.id,
        session_id=session_id,
        role=assistant_record.role,
        message=assistant_record.message,
    )


@app.post("/api/v1/chat/messages", response_model=ChatMessageOut)
def chat_message(payload: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    context = get_chat_context(payload.file_id, db, current_user)
    message = get_assistant_provider().respond(payload.message, context, explanation_mode=payload.explanation_mode)
    return ChatMessageOut(id=0, role="assistant", message=message)
