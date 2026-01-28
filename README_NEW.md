# 🧮 MathAI Frontend - Smart Math Problem Solver with AI

A beautiful, fully-functional React frontend for the MathAI platform. Users can submit math problems and receive step-by-step explanations from an AI agent, with tutor-mode guidance for uncertain answers.

## ✨ Key Features

### 🎯 Problem Solving
- Submit math problems in plain text (up to 5,000 characters)
- Get instant step-by-step solutions with animations
- View confidence scores for each solution
- Expandable steps with detailed explanations

### 🎓 Tutor Mode
- Automatic activation for low-confidence solutions
- Progressive hint reveal system
- "Show Full Solution" when ready
- Encouraging learning-focused messages

### 👍 Feedback System
- Mark solutions as "Helpful" or "Incorrect"
- Submit feedback to backend for continuous improvement
- Analytics tracking for quality monitoring

### 🎨 Beautiful UI/UX
- Dark theme with green accents
- Smooth animations and transitions
- Fully responsive design (mobile/tablet/desktop)
- Custom loading states with personality
- Error handling with recovery options

### 🔐 Authentication
- Secure sign-up and sign-in with Clerk
- User profile management
- Protected routes and sessions

### 📊 Conversation Management
- Save and manage conversation history
- View recent conversations in sidebar
- Start new conversations with one click
- Collapsible sidebar for more screen space

### 📈 Analytics
- Track problems submitted
- Monitor average response times
- Measure tutor mode usage
- Analyze feedback patterns

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local and add your Clerk public key and API URL

# 3. Start development server
npm run dev

# 4. Open browser
# Visit http://localhost:5173
```

### Build for Production
```bash
npm run build
npm run preview  # Preview the build
```

## 📋 Project Structure

```
src/
├── components/         # Reusable UI components
├── features/          # Feature-specific components
├── layouts/           # App layouts
├── services/          # API integration
├── types/             # TypeScript definitions
├── utils/             # Utility functions
├── theme/             # Theme management
├── App.tsx            # Main app with routing
└── index.css          # Global styles
```

## 🔌 Backend API Integration

The frontend expects these API endpoints from your backend:

### POST /api/solve
Submit a problem and get a solution.

**Request:**
```json
{
  "problem": "Find the derivative of x^2",
  "language": "en"
}
```

**Response:**
```json
{
  "solution": {
    "id": "solution-uuid",
    "steps": [
      {
        "id": "step-1",
        "title": "Step title",
        "description": "Step explanation",
        "formula": "optional formula"
      }
    ],
    "finalAnswer": "2x",
    "confidence": 95,
    "confidenceLevel": "high",
    "status": "ok",
    "timestamp": 1706428800000
  }
}
```

**Status values:**
- `"ok"` - High confidence solution, display normally
- `"tutor"` - Low confidence, show hints mode
- `"refusal"` - Cannot solve, show refusal message

### POST /api/feedback
Submit user feedback on a solution.

**Request:**
```json
{
  "solutionId": "solution-uuid",
  "type": "helpful" | "incorrect",
  "timestamp": 1706428800000
}
```

### POST /api/analytics
Track user interactions (non-critical).

**Request:**
```json
{
  "eventType": "problem_submitted" | "tutor_mode_triggered" | "feedback_submitted",
  "solutionId": "optional-uuid",
  "responseTime": 234,
  "timestamp": 1706428800000
}
```

## 🎨 Customization

### Change Brand Colors
Edit `src/index.css` and update the color references. Default colors:
- Primary: `#008751`
- Primary Light: `#00b876`

### Add Custom Animations
Add new animations in `src/index.css` using the `@keyframes` rule.

### Modify API Base URL
Set `VITE_API_BASE_URL` in `.env.local`:
```
VITE_API_BASE_URL=http://your-backend:8000/api
```

## 🧪 Testing

### Test the Happy Path
1. Sign up or log in
2. Type: "What is the derivative of x^2?"
3. Click send
4. See the solution with steps
5. Click "Helpful" or "Incorrect"

### Test Tutor Mode
Ensure your backend returns `status: "tutor"` for low-confidence solutions.

### Test Error Handling
1. Stop your backend API
2. Try to submit a problem
3. Error message should appear with retry button

## 📊 Components Overview

### LoadingState
Custom loading screen with math symbol animation. Used during authentication and problem solving.

### SolutionDisplay
Renders AI solutions with steps, confidence indicator, and feedback buttons. Handles all response statuses.

### TutorMode
Interactive tutoring interface with progressive hint reveal. Automatically triggered for low-confidence solutions.

### FeedbackButtons
Allows users to provide feedback on solution quality. Submits to backend and tracks analytics.

### ConfidenceIndicator
Visual confidence percentage with color-coded levels and circular progress indicator.

### ChatInput
Problem input field with character limit validation and send button.

### ChatMessage
Main chat interface displaying user problems and AI solutions with message history.

### Sidebar
Navigation sidebar with conversation history and user profile.

## 🔒 Security & Privacy

- No sensitive data stored in browser
- No client-side persistence of solutions
- Auth tokens optional for API calls
- All HTTPS ready
- Environment variables for secrets

## 📱 Responsive Design

Works perfectly on:
- Desktop (1920x1080+)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)

## 📚 Documentation

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Complete technical guide
- [PRD_COMPLIANCE.md](./PRD_COMPLIANCE.md) - PRD verification
- [QUICK_START.md](./QUICK_START.md) - Setup and usage
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Implementation summary
- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) - File organization
- [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) - Verification checklist

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [KaTeX Math Rendering](https://katex.org)

## 🐛 Troubleshooting

### API not connecting
- Check `VITE_API_BASE_URL` in `.env.local`
- Verify backend is running
- Check browser console for CORS errors

### Clerk not working
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is correct
- Check Clerk dashboard configuration
- Clear cookies and try again

### Styling not applying
- Restart dev server
- Clear browser cache
- Ensure `@import "tailwindcss"` in `src/index.css`

## 📦 Dependencies

### Production
- react (^19.2.0) - UI framework
- react-router-dom (^7.13.0) - Routing
- @clerk/clerk-react (^5.59.6) - Authentication
- tailwindcss (^4.1.18) - Styling
- katex (^0.16.9) - Math rendering

### Development
- TypeScript (^5.9.3)
- Vite (^7.2.4)
- ESLint (^9.39.1)

## 🚀 Deployment

### Deploy to Vercel
```bash
vercel
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console errors (F12)
3. Check `.env.local` configuration
4. Verify backend is running
5. Review API response format

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

---

**Status**: ✅ Production Ready

**Last Updated**: January 28, 2026

**Version**: 1.0.0

Start solving math problems with AI! 🎓