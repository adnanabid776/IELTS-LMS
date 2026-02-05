# IELTS LMS Database Dump

This directory contains a JSON snapshot of the MongoDB database for the IELTS Learning Management System. These files allow developers to restore the application's data state (users, tests, questions, etc.) for local development.

## 📂 Database Contents

| File                         | Collection    | Description                                                     |
| ---------------------------- | ------------- | --------------------------------------------------------------- |
| `ielts-lms.users.json`       | `users`       | Student, Teacher, and Admin accounts.                           |
| `ielts-lms.tests.json`       | `tests`       | IELTS test definitions (Reading, Listening, Writing, Speaking). |
| `ielts-lms.sections.json`    | `sections`    | Sections belonging to each test (e.g., Section 1, Section 2).   |
| `ielts-lms.questions.json`   | `questions`   | The question bank linked to sections.                           |
| `ielts-lms.assignments.json` | `assignments` | Tests assigned by teachers to students.                         |
| `ielts-lms.sessions.json`    | `sessions`    | Active or completed test attempts by students.                  |
| `ielts-lms.results.json`     | `results`     | Final graded results and scores.                                |

## 📥 How to Import (Restore Data)

To restore this data into your local MongoDB instance, run the following commands in your terminal from this `data/` directory:

### Prerequisites

- MongoDB installed and running locally.
- **MongoDB Database Tools** (specifically `mongoimport`) installed.

### Import Commands

```bash
# Import Users
mongoimport --db ielts-lms --collection users --file ielts-lms.users.json --jsonArray

# Import Tests & Content
mongoimport --db ielts-lms --collection tests --file ielts-lms.tests.json --jsonArray
mongoimport --db ielts-lms --collection sections --file ielts-lms.sections.json --jsonArray
mongoimport --db ielts-lms --collection questions --file ielts-lms.questions.json --jsonArray

# Import Activity Data (Optional)
mongoimport --db ielts-lms --collection assignments --file ielts-lms.assignments.json --jsonArray
mongoimport --db ielts-lms --collection sessions --file ielts-lms.sessions.json --jsonArray
mongoimport --db ielts-lms --collection results --file ielts-lms.results.json --jsonArray
```

**Note**: If you want to clear existing data before importing, add the `--drop` flag to the commands (e.g., `mongoimport --drop ...`).
