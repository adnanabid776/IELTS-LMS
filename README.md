# IELTS LMS - Comprehensive Learning Platform

A full-featured Learning Management System designed specifically for IELTS preparation. This platform bridges the gap between students and educators by providing a realistic testing environment and streamlined grading workflows.

<img width="1365" height="594" alt="image" src="https://github.com/user-attachments/assets/27d9e9da-4a10-4036-9761-ecb50e7ba84e" />
<img width="1365" height="602" alt="image" src="https://github.com/user-attachments/assets/95c6bd40-4f7d-490e-9805-5a11d040e601" />
<img width="1365" height="601" alt="image" src="https://github.com/user-attachments/assets/eccfd066-df9f-414d-8a93-3e0575c096a8" />




## 🚀 Key Features

### 🎓 Student Portal

- **Full Mock Tests**: Simulates real exam conditions for Reading, Listening, Writing, and Speaking modules.
- **Advanced Interactive UI**: Custom interactive question components natively mimicking IELTS types (e.g., dynamic *Form-Completion* with interactive table blanks, *Multiple-Choice Multi* scaling).
- **Subjective Essay Editor**: Dedicated Writing Module interface with enforced character counting and embedded rich graphic prompts.
- **Instant Feedback**: Highly complex backend grading engine automatically filters and recursively scales multi-point objective arrays.
- **Progress Tracking**: Detailed analytics charts showing band score trends and module-wise performance.
- **Optimized Experience**: Fast React Suspense rendering mapped to paginated grid layouts.

### 👩‍🏫 Teacher Portal

- **Pending Reviews Dashboard**: Centralized hub to manage ungraded subjective submissions (Writing/Speaking).
- **Manual Grading Support**: Dedicated interface for grading essays directly against official analytical rubrics.
- **Assignment Management**: Push curated practice tests directly to specified student dashboards.
- **Student Monitoring**: Deep-dive analytics on individual student progress and historical bottlenecks.

### 🛠 Admin Portal

- **Bulk JSON Imports**: Ultra-fast test generation via structured JSON bulk-uploads allowing 40+ questions to be imported instantly.
- **Advanced Question Bank**: Create and edit up to 18 distinct complex question structures dynamically.
- **Hybrid Local Storage**: Robust localized API bypasses cloud requirements, safely injecting audio files and prompt imagery directly into a secure `/uploads` root. 
- **System Analytics**: Live overview of platform usage, total tests taken, and active users globally.

## 🌟 Recent Major Updates

- **Admin-Controlled User Management 👤**: Removed public sign-up flows entirely. The platform now operates on an exclusive access model where strictly administrators can create, update, or delete user accounts, increasing institutional control and security.
- **Interactive Form Completion Architecture 📝**: Deployed a fully mapped "Form Builder" UI allowing admins to dynamically generate authentic IELTS-style input tables. The live test renderer seamlessly assigns increasing Roman/Numerical sequence IDs exclusively to interactive blanks, bypassing static headings completely.
- **Comprehensive Answer Review System 📊**: Added a robust unified `AnswerReview` page with dynamic UI state handling that natively renders complex numerical string indexes, completely eliminating visually ambiguous row labels and mismatched index anomalies.
- **Dual-Track Architecture (Academic vs General) 🛡️**: The platform now enforces a strict separation between "Academic" and "General Training" tracks. Students are physically locked to their assigned tracks via an API-level filter, and any changes made by an admin trigger a synchronous, real-time update on the student's dashboard without a manual logout.
- **Advanced Grading Engine 🧠**: Completely overhauled the auto-grading algorithm. It now features "fuzzy matching" that safely strips structural noise from user answers (e.g., articles like `a`, `an`, `the`, embedded HTML tags, specific punctuation). It resolves complex matching questions dynamically regardless of capitalization.
- **Deep Security Hardening 🔒**: Successfully audited against 100+ critical edge-cases. The platform now intrinsically blocks concurrent multi-device sessions, prevents form double-submissions, and strictly denies IDOR (Insecure Direct Object Reference) attempts.
- **Enhanced JSON Bulk Uploader ⚙️**: Admins can now mass-inject full test suites using complex, nested JSON configurations that seamlessly handle composite items (like diagram or map labeling).

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
