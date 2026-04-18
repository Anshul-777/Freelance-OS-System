# Freelance-OS

A comprehensive freelance business management platform built with React, TypeScript, FastAPI, and SQLite.

## Features

- **Dashboard**: Real-time analytics and financial overview
- **Project Management**: Track projects, budgets, and completion status
- **Client Management**: Manage client information and relationships
- **Time Tracking**: Track billable hours with automatic calculations
- **Invoice Management**: Create, send, and track invoices with payment status
- **Expense Tracking**: Categorize and track business expenses
- **Analytics**: Detailed financial and productivity analytics
- **User Profiles**: Customizable profile cards with 6 gradient templates
- **Settings**: Comprehensive account settings with 5 management tabs
- **Notifications**: Multi-channel notification system

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite 5.4.21
- Tailwind CSS
- Lucide React Icons
- Zustand for state management
- React Router for navigation
- React Hot Toast for notifications
- Recharts for analytics

### Backend
- FastAPI
- SQLAlchemy 2 ORM
- Pydantic v2
- SQLite Database
- Alembic Migrations
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.8+
- Git

### Frontend Setup

```bash
cd FreelanceOS/freelanceos/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Backend Setup

```bash
cd FreelanceOS/freelanceos/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs on `http://localhost:8000`

### Database Initialization

```bash
cd FreelanceOS/freelanceos/backend
python create_db.py
python seed_data.py  # Optional: load sample data
alembic upgrade head
```

## Project Structure

```
FreelanceOS/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── api/             # API integration
│   │   ├── store/           # Zustand state management
│   │   └── utils/           # Helper functions
│   └── package.json
├── backend/                 # FastAPI application
│   ├── routers/            # API route handlers
│   ├── services/           # Business logic
│   ├── models.py           # Database models
│   ├── schemas.py          # Pydantic schemas
│   ├── main.py             # FastAPI app entry
│   └── requirements.txt
└── README.md
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive Swagger documentation.

## Key Pages

- `/app/dashboard` - Main dashboard
- `/app/profile` - User profile with customizable cards
- `/app/settings` - Comprehensive settings (5 tabs)
- `/app/projects` - Project management
- `/app/invoices` - Invoice management
- `/app/expenses` - Expense tracking
- `/app/time-tracker` - Time entry tracking
- `/app/analytics` - Business analytics

## Authentication

The app uses JWT-based authentication. Users must register and log in to access the application.

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=sqlite:///./freelanceos.db
JWT_SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or feature requests, please create an issue on GitHub.

## Roadmap

- [ ] Multi-currency support
- [ ] Advanced tax calculations
- [ ] Email integration for invoices
- [ ] Mobile app
- [ ] Real-time collaboration
- [ ] Advanced reporting
- [ ] Integration with payment gateways
