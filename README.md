# IELTS LMS - Comprehensive Learning Platform

A full-featured Learning Management System designed specifically for IELTS preparation. This platform bridges the gap between students and educators by providing a realistic testing environment and streamlined grading workflows.

![IELTS LMS Dashboard](https://via.placeholder.com/800x400?text=IELTS+LMS+Preview)
_(Replace with actual screenshot of your dashboard)_

## 🚀 Key Features

### 🎓 Student Portal

- **Full Mock Tests**: Simulates real exam conditions for Reading, Listening, Writing, and Speaking modules.
- **Instant Feedback**: Auto-grading for objective tests (Reading/Listening) with immediate score calculation.
- **Progress Tracking**: Detailed analytics charts showing band score trends and module-wise performance.
- **Test History**: Access to past attempts and teacher feedback.

### 👩‍🏫 Teacher Portal

- **Pending Reviews Dashboard**: Centralized hub to manage ungraded submissions.
- **Manual Grading Support**: Dedicated interface for grading Writing essays and Speaking recordings with rubric-based scoring.
- **Assignment Management**: Create and assign practice tests to specific students or groups.
- **Student Monitoring**: View individual student progress and performance statistics.

### 🛠 Admin Portal

- **User Management**: Manage student and teacher accounts, roles, and permissions.
- **Question Bank**: Create and edit questions for all IELTS modules.
- **System Analytics**: Overview of platform usage, total tests taken, and active users.

## 🛠 Tech Stack

**Frontend**

- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Context / Hooks
- **HTTP Client**: Axios

**Backend**

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer (for audio/image uploads)

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (Local or Atlas)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ielts-lms.git
cd ielts-lms
```

### 2. Backend Setup

```bash
cd backend
npm install
```

**Environment Variables (`backend/.env`):**
Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ielts-lms
JWT_SECRET=your_jwt_secret_key_here
```

**Run Backend:**

```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal configuration:

```bash
cd frontend
npm install
```

**Run Frontend:**

```bash
npm run dev
```

The application should now be running at `http://localhost:5173` (or the port shown in your terminal).

## 💾 Database Import

If you have a database dump (JSON files), you can import them using `mongoimport`.
_See `github_and_database_guide.md` for details on exporting/importing data._

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the ISC License.
# IELTS-LMS
