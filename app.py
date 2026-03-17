from flask import Flask, render_template, request
import pandas as pd

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():
    labels = []
    attendance_data = []
    revenue_data = []
    class_labels = []
    class_data = []

    if request.method == "POST":
        file = request.files["file"]

        if file:
            df = pd.read_csv(file)

            attendance_group = df.groupby("Date")["Attendance"].sum()
            labels = attendance_group.index.tolist()
            attendance_data = attendance_group.values.tolist()

            revenue_group = df.groupby("Date")["Revenue"].sum()
            revenue_data = revenue_group.values.tolist()

            class_group = df["Class"].value_counts()
            class_labels = class_group.index.tolist()
            class_data = class_group.values.tolist()

    return render_template(
        "index.html",
        labels=labels,
        attendance=attendance_data,
        revenue=revenue_data,
        class_labels=class_labels,
        class_data=class_data
    )


if __name__ == "__main__":
    app.run(debug=True)
