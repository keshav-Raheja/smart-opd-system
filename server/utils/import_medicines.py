import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(mongo_uri)

db = client["smart_opd"]

medicines_collection = db["medicines"]

csv_file = "datasets/medicine_dataset.csv"

df = pd.read_csv(csv_file, low_memory=False)

medicine_documents = []

for index, row in df.iterrows():

    medicine_name = str(row["name"]).strip()

    if medicine_name == "nan":
        continue

    substitutes = []

    for i in range(5):

        value = row.get(f"substitute{i}")

        if pd.notna(value):
            substitutes.append(str(value))

    side_effects = []

    for i in range(42):

        value = row.get(f"sideEffect{i}")

        if pd.notna(value):
            side_effects.append(str(value))

    uses = []

    for i in range(5):

        value = row.get(f"use{i}")

        if pd.notna(value):
            uses.append(str(value))

    medicine_data = {
        "name": medicine_name,
        "substitutes": substitutes,
        "side_effects": side_effects,
        "uses": uses,
        "chemical_class": row.get("Chemical Class"),
        "habit_forming": row.get("Habit Forming"),
        "therapeutic_class": row.get("Therapeutic Class"),
        "action_class": row.get("Action Class")
    }

    medicine_documents.append(medicine_data)

    if len(medicine_documents) >= 1000:

        medicines_collection.insert_many(
            medicine_documents,
            ordered=False
        )

        print(f"Inserted {len(medicine_documents)} medicines")

        medicine_documents = []


if medicine_documents:

    medicines_collection.insert_many(
        medicine_documents,
        ordered=False
    )

print("Medicine dataset imported successfully")