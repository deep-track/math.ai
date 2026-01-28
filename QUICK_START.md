# Quick Start Guide - MathAI Frontend

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example to actual env file
cp .env.example .env.local

# Edit .env.local and add:
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
VITE_API_BASE_URL=http://localhost:8000/api
```

### Step 3: Start Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:5173**

---

## 🎯 What's Included

### ✨ Features Ready to Use

#### 1. **Problem Solving Interface**
- Submit math problems up to 5,000 characters
- Receive step-by-step solutions from AI backend
- View confidence scores for each solution
- Expandable steps with detailed explanations

#### 2. **Smart Tutoring System**
- Automatic tutor mode for uncertain solutions
- Progressive hint reveal system
- "Show Full Solution" when ready
- Encouraging learning messages

#### 3. **Feedback System**
- Mark solutions as "Helpful" or "Incorrect"
- Feedback submits to backend
- Analytics tracking for improvement

#### 4. **Beautiful UI/UX**
- Dark theme with green accents
- Smooth animations and transitions
- Responsive design (works on mobile/tablet/desktop)
- Custom loading states with animations

#### 5. **Authentication**
- Sign up and sign in with Clerk
- User profile management
- Secure session handling

#### 6. **Conversation Management**
- Save conversations to sidebar
- View chat history
- Start new conversations
- Collapsible sidebar for more screen space

#### 7. **Analytics**
- Track problems submitted
- Monitor average response times
- Track tutor mode usage
- Record feedback patterns

---

## 📦 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── LoadingState.tsx        # Custom loading animations
│   ├── SolutionDisplay.tsx      # Solution rendering
│   ├── TutorMode.tsx           # Tutoring interface
│   ├── FeedbackButtons.tsx      # Feedback submission
│   ├── ConfidenceIndicator.tsx  # Confidence display
│   ├── ErrorDisplay.tsx        # Error handling
│   └── ErrorBoundary.tsx       # Error boundary
├── features/
│   ├── auth/                   # Authentication pages
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── chat/                   # Chat interface
│   │   ├── ChatInput.tsx        # Input component
│   │   ├── ChatMessage.tsx      # Message display
│   │   └── ChatWindow.tsx       # Main chat area
│   └── sidebar/                # Sidebar navigation
│       └── Sidebar.tsx
├── layouts/
│   └── MainLayout.tsx          # Main app layout
├── services/
│   └── api.ts                  # Backend API calls
├── types/
│   └── index.ts                # TypeScript definitions
├── utils/
│   ├── analytics.ts            # Analytics tracking
│   └── mathRender.tsx          # Math rendering (KaTeX)
├── theme/
│   ├── ThemeProvider.tsx       # Theme context
│   └── useTheme.tsx            # Theme hook
├── App.tsx                     # App routing
├── main.tsx                    # Entry point
└── index.css                   # Global styles + animations
```

---

## 🔌 Backend API Integration

### Required Backend Endpoints

Your backend API should implement:

#### 1. Solve Problem
```
POST /api/solve
Body: {
  problem: "Write the quadratic formula",
  language: "en"
}
Response: {
  solution: {
    id: "uuid",
    steps: [
      {
        id: "step-1",
        title: "Understand the problem",
        description: "We need to derive the quadratic formula",
        formula: "ax^2 + bx + c = 0"
      }
    ],
    finalAnswer: "x = (-b ± √(b²-4ac)) / 2a",
    confidence: 95,
    confidenceLevel: "high",
    status: "ok",
    timestamp: 1706428800000
  }
}
```

#### 2. Submit Feedback
```
POST /api/feedback
Body: {
  solutionId: "uuid",
  type: "helpful" | "incorrect",
  timestamp: 1706428800000
}
Response: {
  success: true,
  message: "Feedback recorded"
}
```

#### 3. Track Analytics
```
POST /api/analytics
Body: {
  eventType: "problem_submitted" | "tutor_mode_triggered" | "feedback_submitted",
  solutionId: "uuid",
  responseTime: 234,
  timestamp: 1706428800000
}
Response: {
  success: true
}
```

---

## 🎨 Customization Guide

### Change Brand Colors
Edit `src/index.css` and update color references:
```css
Primary: #008751
Primary Light: #00b876
Dark BG: #0A0A0A
```

### Add Custom Animations
Add to `src/index.css`:
```css
@keyframes myAnimation {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.animate-myAnimation {
  animation: myAnimation 0.3s ease-in-out;
}
```

### Modify Loading Screen
Edit `src/components/LoadingState.tsx`:
- Change symbol (currently ∑)
- Adjust animation speed
- Update colors

### Change Sidebar Width
In `src/features/sidebar/Sidebar.tsx`:
```tsx
${isCollapsed ? 'w-20' : 'w-64'}  // Change w-64 to desired width
```

---

## 🧪 Testing Scenarios

### Test Scenario 1: Happy Path
1. Go to http://localhost:5173
2. Sign up with test email
3. Type: "What is the derivative of x^2?"
4. Click send
5. Wait for solution
6. See steps with animations
7. Click "Helpful" button
8. Verify success message

### Test Scenario 2: Tutor Mode
1. Ensure backend returns status: "tutor"
2. Solution should show hints
3. Hints should be collapsible
4. "Show Full Solution" button appears
5. Can expand to see full answer

### Test Scenario 3: Error Handling
1. Disconnect network / stop backend
2. Try to submit problem
3. Error message appears
4. "Try Again" button works
5. Can retry submission

### Test Scenario 4: Mobile Responsive
1. Open DevTools (F12)
2. Toggle device toolbar
3. Test on iPhone SE, iPad, Desktop
4. Sidebar collapses on mobile
5. All buttons accessible

---

## 🔑 Environment Variables

Required:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_API_BASE_URL=http://localhost:8000/api
```

Optional:
```
VITE_ENABLE_KATEX=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_TUTOR_MODE=true
```

---

## 📱 Responsive Design

The frontend works perfectly on:
- ✅ Desktop (1920x1080 and up)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

Breakpoints used:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🚀 Build & Deploy

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview  # Preview production build locally
```

### Deploy to Vercel
```bash
vercel
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

---

## 🐛 Troubleshooting

### Issue: API not connecting
**Solution:**
- Check `VITE_API_BASE_URL` in `.env.local`
- Verify backend is running on correct port
- Check browser console for CORS errors

### Issue: Clerk authentication not working
**Solution:**
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is correct
- Check Clerk dashboard for app configuration
- Clear browser cookies and try again

### Issue: Animations not smooth
**Solution:**
- Clear browser cache
- Disable browser extensions
- Check GPU acceleration is enabled

### Issue: Tailwind styles not applying
**Solution:**
- Ensure `@import "tailwindcss"` in `src/index.css`
- Restart dev server
- Clear `.next` or `dist/` folder

---

## 📚 Documentation

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Complete implementation details
- [PRD_COMPLIANCE.md](./PRD_COMPLIANCE.md) - PRD checklist
- [README.md](./README.md) - Project overview

---

## 💡 Pro Tips

1. **Use React DevTools** - Install React extension for browser debugging
2. **Network Tab** - Watch API calls in DevTools Network tab
3. **Console** - Check for any JavaScript errors
4. **Lighthouse** - Run performance audit (DevTools)
5. **Responsive Testing** - Use DevTools device toggle

---

## 🎓 Learning Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Tailwind CSS Utilities](https://tailwindcss.com/docs/utility-first)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clerk Authentication](https://clerk.com/docs)
- [KaTeX Math Rendering](https://katex.org/docs/autorender.html)

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console errors (F12)
3. Check `.env.local` configuration
4. Verify backend is running and responding
5. Check API response format matches types

---

**Ready to launch! 🚀**

Run `npm run dev` and start building amazing math learning experiences!
