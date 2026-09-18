from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    email: Optional[EmailStr] = None


class UserRoleOut(BaseModel):
    role: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None


class ProjectOut(ProjectCreate):
    id: int
    owner_id: int


class FileUploadMeta(BaseModel):
    filename: str
    language: str
    content: str


class FileOut(BaseModel):
    id: int
    project_id: int
    filename: str
    language: str
    status: str
    storage_path: str
    content: str


class AnalysisJobOut(BaseModel):
    id: int
    file_id: int
    status: str
    result_summary: Optional[str] = None


class ErrorFinding(BaseModel):
    line: int
    message: str
    suggestion: str
    severity: str = "error"


class AnalysisResult(BaseModel):
    file_id: int
    language: str
    error_count: int
    status: str
    errors: list[ErrorFinding]


class AnalysisSummary(BaseModel):
    file_id: int
    language: str
    status: str
    error_count: int
    summary: Optional[str] = None


class ReportCreate(BaseModel):
    file_id: int
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ReportOut(ReportCreate):
    id: int
    user_id: int


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: Optional[str] = None


class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)
    file_id: Optional[int] = None
    explanation_mode: Literal["beginner", "intermediate", "advanced"] = "beginner"


class ChatMessageOut(BaseModel):
    id: int
    role: str
    message: str


class ChatSessionCreate(BaseModel):
    title: str = Field(default="Debugging session", min_length=1)
    file_id: Optional[int] = None


class ChatSessionOut(BaseModel):
    id: int
    title: str
    file_id: Optional[int] = None


class ChatSessionMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)
    explanation_mode: Literal["beginner", "intermediate", "advanced"] = "beginner"


class ChatSessionMessageOut(ChatMessageOut):
    session_id: int
