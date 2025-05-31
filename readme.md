# Glamex Backend

This repository contains the backend code for the Glamex project.

## Features

- RESTful API endpoints
- User authentication and authorization
- MySQL database integration
- Modular code structure

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MySQL

### Installation

```bash
git clone https://github.com/yourusername/glamex-backend.git
cd glamex-backend
npm install
```

### Running the Server

```bash
npm start
```

### Database Migration and Seeding

To run database migrations:

```bash
npm run migrate
```

To run database seeders:

```bash
npm run seed
```

## Project Structure

```
/src
    /migration           # Database migration files
    /application
        /models         # Application models
        /middlewares    # Middleware functions
        /resource       # API route handlers and related logic
```

## API URL

The backend server runs at: `http://localhost:3000/api/v1/`
