import csv
import io
import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, Response
import pandas as pd
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "gym_analytics_secret"
app.jinja_env.globals["enumerate"] = enumerate

UPLOAD_PATH = "uploaded_data.csv"


def get_df():
    if not os.path.exists(UPLOAD_PATH):
        return None
    df = pd.read_csv(UPLOAD_PATH)
    df["Date"] = pd.to_datetime(df["Date"])
    df["Revenue"] = pd.to_numeric(
        df["Revenue"].astype(str).str.replace(r"[^\d.]", "", regex=True), errors="coerce"
    ).fillna(0)
    return df


@app.route("/", methods=["GET", "POST"])
def home():
    labels = []
    attendance_data = []
    revenue_data = []
    class_labels = []
    class_data = []
    total_revenue = 0
    active_members = 0
    popular_class = "-"

    if request.method == "POST":
        file = request.files["file"]
        if file:
            file.save(UPLOAD_PATH)

    df = get_df()
    if df is not None:
        attendance_group = df.groupby("Date")["Attendance"].sum()
        labels = attendance_group.index.strftime("%Y-%m-%d").tolist()
        attendance_data = attendance_group.values.tolist()

        revenue_group = df.groupby("Date")["Revenue"].sum()
        revenue_data = revenue_group.values.tolist()

        class_group = df["Class"].value_counts()
        class_labels = class_group.index.tolist()
        class_data = class_group.values.tolist()

        total_revenue = int(df["Revenue"].sum())
        thirty_days_ago = datetime.now() - timedelta(days=30)
        active_members = df[df["Date"] >= thirty_days_ago]["Member_ID"].nunique()
        popular_class = class_group.idxmax() if not class_group.empty else "-"

    return render_template(
        "index.html",
        labels=labels,
        attendance=attendance_data,
        revenue=revenue_data,
        class_labels=class_labels,
        class_data=class_data,
        total_revenue=total_revenue,
        active_members=active_members,
        popular_class=popular_class,
        data_loaded=df is not None,
    )


@app.route("/inactive_members")
def inactive_members_page():
    df = get_df()
    inactive_members = []
    if df is not None:
        group_cols = ["Member_ID", "Name"]
        if "Email" in df.columns:
            group_cols.append("Email")
        if "Phone" in df.columns:
            group_cols.append("Phone")
        last_visit = df.groupby(group_cols)["Date"].max().reset_index()
        thirty_days_ago = datetime.now() - timedelta(days=30)
        inactive_members = last_visit[last_visit["Date"] < thirty_days_ago].to_dict("records")
    return render_template("inactive_members.html", inactive_members=inactive_members)


@app.route("/inactive_members/export")
def export_inactive_members():
    df = get_df()
    if df is None:
        flash("No data loaded.", "error")
        return redirect(url_for("inactive_members_page"))

    group_cols = ["Member_ID", "Name"]
    if "Email" in df.columns:
        group_cols.append("Email")
    if "Phone" in df.columns:
        group_cols.append("Phone")
    last_visit = df.groupby(group_cols)["Date"].max().reset_index()
    thirty_days_ago = datetime.now() - timedelta(days=30)
    inactive = last_visit[last_visit["Date"] < thirty_days_ago]

    buf = io.StringIO()
    inactive.to_csv(buf, index=False)
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=inactive_members.csv"},
    )


@app.route("/inactive_members/send_reminders", methods=["POST"])
def send_reminders():
    df = get_df()
    if df is None or "Email" not in df.columns:
        flash("No data or no Email column found.", "error")
        return redirect(url_for("inactive_members_page"))

    group_cols = ["Member_ID", "Name", "Email"]
    last_visit = df.groupby(group_cols)["Date"].max().reset_index()
    thirty_days_ago = datetime.now() - timedelta(days=30)
    inactive = last_visit[last_visit["Date"] < thirty_days_ago]

    sent = 0
    for _, row in inactive.iterrows():
        email = row["Email"]
        name = row["Name"]
        # TODO: replace with real email logic
        print(f"[STUB] Would send reminder to {name} <{email}>")
        sent += 1

    flash(f"Reminder emails sent to {sent} inactive member(s).", "success")
    return redirect(url_for("inactive_members_page"))


@app.route("/complaints", methods=["GET", "POST"])
def complaints():
    if request.method == "POST":
        member_id = request.form["member_id"][:50]
        complaint_text = request.form["complaint_text"][:1000]

        df = get_df()
        if df is not None and not (df["Member_ID"].astype(str) == member_id).any():
            flash(f"Member ID '{member_id}' not found.", "error")
            return redirect(url_for("complaints"))

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open("complaints.csv", "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([member_id, complaint_text, "Pending", timestamp])

        flash("Complaint submitted.", "success")
        return redirect(url_for("complaints"))

    complaints_df = pd.read_csv("complaints.csv")
    return render_template("complaints.html", complaints=complaints_df.to_dict("records"))


@app.route("/complaints/delete/<int:index>", methods=["POST"])
def delete_complaint(index):
    df = pd.read_csv("complaints.csv")
    if 0 <= index < len(df):
        df = df.drop(index).reset_index(drop=True)
        df.to_csv("complaints.csv", index=False)
    return redirect(url_for("complaints"))


@app.route("/performance", methods=["GET", "POST"])
def performance():
    df = get_df()
    members = df["Name"].unique().tolist() if df is not None else []
    heatmap_data = {}
    member_name = None

    if request.method == "POST":
        member_name = request.form["member_name"]
        if df is not None:
            try:
                member_df = df[df["Name"] == member_name].copy()
                if not member_df.empty:
                    daily_attendance = member_df.groupby("Date")["Attendance"].sum()
                    full_date_range = pd.date_range(
                        start=daily_attendance.index.min(),
                        end=daily_attendance.index.max(),
                        freq="D",
                    )
                    member_activity = daily_attendance.reindex(full_date_range, fill_value=0)
                    heatmap_data = {
                        int(date.timestamp()): (1 if att > 0 else 0)
                        for date, att in member_activity.items()
                    }
            except Exception as e:
                print(f"Error processing performance data for {member_name}: {e}")
                flash("Error loading performance data.", "error")

    return render_template(
        "performance.html", members=members, heatmap_data=heatmap_data, member_name=member_name
    )


@app.route("/feedback", methods=["GET", "POST"])
def feedback():
    if request.method == "POST":
        member_id = request.form["member_id"][:50]
        feedback_text = request.form["feedback_text"][:1000]
        rating = request.form["rating"]
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open("feedback.csv", "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([member_id, feedback_text, rating, timestamp])

        flash("Feedback submitted.", "success")
        return redirect(url_for("feedback"))

    feedback_df = pd.read_csv("feedback.csv")
    return render_template("feedback.html", feedbacks=feedback_df.to_dict("records"))


@app.route("/feedback/delete/<int:index>", methods=["POST"])
def delete_feedback(index):
    df = pd.read_csv("feedback.csv")
    if 0 <= index < len(df):
        df = df.drop(index).reset_index(drop=True)
        df.to_csv("feedback.csv", index=False)
    return redirect(url_for("feedback"))


if __name__ == "__main__":
    app.run(debug=True)
