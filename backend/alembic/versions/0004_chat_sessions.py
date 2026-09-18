"""Add persistent chat sessions and messages."""

from alembic import op
import sqlalchemy as sa

revision = "0004_chat_sessions"
down_revision = "0003_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_id", sa.Integer(), sa.ForeignKey("uploaded_files.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
    )
    op.create_index("ix_chat_sessions_id", "chat_sessions", ["id"])
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("chat_sessions.id"), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
    )
    op.create_index("ix_chat_messages_id", "chat_messages", ["id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chat_sessions_id", table_name="chat_sessions")
    op.drop_table("chat_sessions")