"""Add persisted debugging reports."""

from alembic import op
import sqlalchemy as sa

revision = "0002_reports"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_id", sa.Integer(), sa.ForeignKey("uploaded_files.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
    )
    op.create_index("ix_reports_id", "reports", ["id"])


def downgrade() -> None:
    op.drop_index("ix_reports_id", table_name="reports")
    op.drop_table("reports")