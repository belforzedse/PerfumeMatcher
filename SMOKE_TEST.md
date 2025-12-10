# Smoke Test Procedure

This document outlines the smoke test procedure for verifying the frontend-to-backend integration.

## Prerequisites

1. Backend is running on http://localhost:8000
2. Frontend is running on http://localhost:3000
3. Environment variables are configured:
   - Backend: `OPENAI_API_KEY` is set
   - Frontend: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api`

## Test Cases

### 1. Perfume Catalog Load

**Objective**: Verify frontend can fetch perfume catalog from backend

**Steps**:
1. Open browser to http://localhost:3000
2. Open browser DevTools (F12) → Console tab
3. Look for log: `[API] Loading perfumes from backend: http://localhost:8000/api/perfumes/`
4. Look for log: `[API] Perfumes loaded from backend: <count>`

**Expected Result**:
- Page loads without errors
- Console shows successful backend fetch
- Perfume count matches backend data

**Fallback Test**:
- Stop backend server
- Refresh page
- Should see: `[API] Attempting local fallback...`
- Should see: `[API] Fallback successful: <count>`

---

### 2. Questionnaire Flow

**Objective**: Verify questionnaire navigation works

**Steps**:
1. Navigate to http://localhost:3000
2. Click "شروع پرسشنامه" (Start Questionnaire) button
3. Answer first question (mood selection)
4. Click "بعدی" (Next) button
5. Continue through all questions
6. Click "دریافت پیشنهادات" (Get Recommendations) on last question

**Expected Result**:
- Smooth navigation between questions
- No errors in console
- Loading animation appears after final submission

---

### 3. AI Recommendations (Full Integration)

**Objective**: Verify full frontend → backend → OpenAI → frontend flow

**Steps**:
1. Complete questionnaire with these answers:
   - Mood: "آرامش‌بخش" (Cozy)
   - Occasion: "قرار عاشقانه" (Date Night)
   - Time: "عصر" (Evening)
   - Intensity: "متوسط" (Moderate)
   - Style: "کلاسیک" (Classic)
   - Liked Notes: "وانیل", "گل رز" (Vanilla, Rose)
   - Disliked Notes: "عود" (Oud)
   - Gender: "زنانه" (Female)

2. Click "دریافت پیشنهادات"

3. Monitor browser console for:
   - `[AI Matcher Client] Starting getAIRankings (backend)...`
   - `[AI Matcher Client] Request completed in <time>ms`
   - `[AI Matcher] Successfully ranked <count> perfumes`

4. Monitor backend terminal for:
   - `POST /api/recommend/ HTTP/1.1" 200`
   - TF-IDF candidate generation logs
   - OpenAI API call logs (if enabled)

**Expected Result**:
- Brain animation plays (5-15 seconds)
- Fun facts rotate during loading
- Results page shows 10 recommendations
- Each recommendation has:
  - Match percentage (high to low order)
  - Perfume name (Persian and English)
  - Brand name
  - Image (if available)
  - Reasons (2-3 bullet points explaining match)

**Timing**:
- Should complete in 5-15 seconds
- Timeout at 30 seconds with error message

---

### 4. Recommendations Display

**Objective**: Verify recommendations render correctly

**Steps**:
1. Review recommendations list
2. Check first recommendation (highest match)
3. Verify all fields are present:
   - ✓ Match percentage badge
   - ✓ Persian name
   - ✓ English name
   - ✓ Brand name
   - ✓ Image (or placeholder)
   - ✓ Match reasons

4. Click on a perfume card (if modal implemented)

**Expected Result**:
- Clean, readable layout
- Persian text displays correctly (RTL)
- Match percentages are reasonable (60-100%)
- Reasons are relevant to questionnaire answers

---

### 5. Error Handling - Backend Down

**Objective**: Verify graceful degradation when backend unavailable

**Steps**:
1. Stop backend server (`Ctrl+C` in backend terminal)
2. Start new questionnaire flow
3. Complete questionnaire
4. Submit for recommendations

**Expected Result**:
- Error message appears: "Backend URL not configured" or connection error
- No browser crash
- Console shows retry attempts
- User sees friendly error message

---

### 6. Error Handling - OpenAI Timeout

**Objective**: Verify fallback to local TF-IDF when AI fails

**Steps**:
1. Temporarily set invalid `OPENAI_API_KEY` in backend
2. Restart backend
3. Complete questionnaire
4. Submit for recommendations

**Expected Result**:
- Recommendations still return (3-5 seconds)
- Backend logs show: "OpenAI unavailable, using local TF-IDF"
- Match reasons are generic: "Based on your preferences"
- Match percentages based on cosine similarity

---

### 7. Performance Test

**Objective**: Verify acceptable response times

**Steps**:
1. Open browser DevTools → Network tab
2. Complete questionnaire
3. Submit for recommendations
4. Monitor timing in Network tab for `/api/recommend/` or backend call

**Expected Metrics**:
- **Catalog load**: < 1 second
- **Recommendations**: 5-15 seconds (with AI)
- **Recommendations**: < 3 seconds (TF-IDF only)
- **Total timeout**: 30 seconds max

---

### 8. CORS Verification

**Objective**: Verify CORS is properly configured

**Steps**:
1. Open browser DevTools → Console tab
2. Complete questionnaire flow
3. Check for CORS errors

**Expected Result**:
- No CORS-related errors in console
- Requests show proper `Access-Control-Allow-Origin` headers

**If CORS errors occur**:
- Check `CORS_ALLOWED_ORIGINS` in `backend/matcher_backend/settings.py`
- Verify frontend URL matches allowed origins
- Restart backend after changes

---

## Automated Test Script

```bash
#!/bin/bash
# Quick smoke test script

echo "=== Starting Smoke Test ==="

echo "1. Testing backend health..."
curl -s http://localhost:8000/api/perfumes/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Backend is responding"
else
    echo "✗ Backend is not responding"
    exit 1
fi

echo "2. Testing frontend..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Frontend is responding"
else
    echo "✗ Frontend is not responding"
    exit 1
fi

echo "3. Testing recommendations endpoint..."
curl -s -X POST http://localhost:8000/api/recommend/ \
  -H "Content-Type: application/json" \
  -d '{"moods":["cozy"],"moments":["casual_day"],"limit":5}' > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Recommendations endpoint working"
else
    echo "✗ Recommendations endpoint failed"
    exit 1
fi

echo "=== All smoke tests passed! ==="
```

## Test Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Perfume catalog loads from backend
- [ ] Questionnaire navigation works
- [ ] Recommendations return successfully
- [ ] Match percentages are displayed
- [ ] Match reasons are relevant
- [ ] Brain animation plays during loading
- [ ] Error handling works (backend down)
- [ ] Fallback to local TF-IDF works (OpenAI down)
- [ ] Performance meets targets (< 15s for AI recommendations)
- [ ] No CORS errors in console

## Success Criteria

The smoke test is considered **PASSED** if:
1. ✓ Perfume catalog loads from backend
2. ✓ Questionnaire flow completes without errors
3. ✓ Recommendations return in < 15 seconds
4. ✓ At least 5 recommendations are displayed
5. ✓ Match percentages are between 60-100%
6. ✓ Match reasons are present and relevant
7. ✓ Error handling degrades gracefully
8. ✓ No critical errors in browser console or backend logs

## Common Issues

### Issue: "Backend URL not configured"
**Solution**: Check `.env.local` in frontend has `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api`

### Issue: CORS errors
**Solution**: Add frontend URL to `CORS_ALLOWED_ORIGINS` in backend settings.py

### Issue: Recommendations timeout
**Solution**: Check OpenAI API key is valid and account has credits

### Issue: No match reasons
**Solution**: Check OpenAI API key; system is falling back to TF-IDF only

### Issue: Backend 500 error
**Solution**: Check backend terminal logs for Python errors; verify migrations ran

## Next Steps After Passing

1. Deploy to staging environment
2. Run full QA test suite
3. Performance profiling
4. User acceptance testing
5. Production deployment

## Contact

For issues or questions about the smoke test:
- Check logs in both frontend (browser console) and backend (terminal)
- Review `FULL_STACK_SETUP.md` for configuration help
- Review `.cursor/backend-integration.mdc` for API details

