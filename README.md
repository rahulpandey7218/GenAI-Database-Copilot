# GenAI-Driven Database Copilot

An intelligent framework for secure, explainable, and optimized multi-database SQL query generation.

## Features

- Natural Language to SQL Generation
- Automatic Database Schema Understanding
- SQL Injection Detection & Security Validation
- Query Classification & Risk Assessment
- Query Explanation
- Multi-Database Support (MySQL, PostgreSQL, SQLite)

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4o-mini
- **Databases**: MySQL, PostgreSQL, SQLite

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- npm or yarn
- OpenAI API Key

### Backend Setup

1. Navigate to the `backend` directory
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Create a `.env` file in the `backend` directory:
   ```
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Start the backend server:
   ```bash
   npm start
   node index.js
   ```

### Frontend Setup

1. Navigate to the `frontend` directory
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and go to http://localhost:3000
2. Configure your database connection
3. Click "Fetch Schema"
4. Enter your natural language prompt
5. Click "Generate SQL"
6. Review the generated SQL, security analysis, and explanation

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── schemaUnderstanding.js
│   │   │   ├── queryGenerator.js
│   │   │   └── securityLayer.js
│   │   ├── routes/
│   │   │   └── api.js
│   ├── index.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```
