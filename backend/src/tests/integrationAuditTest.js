import assert from 'assert'
import jwt from 'jsonwebtoken'
import app from '../app.js'

const PORT = process.env.PORT || 5000
const BASE_URL = `http://127.0.0.1:${PORT}`
let totalTests = 0
let passedTests = 0

function testPassed(msg) {
  totalTests++
  passedTests++
  console.log(`  ✅ PASS: ${msg}`)
}

function testFailed(msg, err) {
  totalTests++
  console.error(`  ❌ FAIL: ${msg}`)
  console.error(`     Error: ${err?.message || err}`)
}

console.log('==================================================')
console.log('🌐 RUNNING LIVE ROUTE INTEGRATION AUDIT SUITE')
console.log('==================================================\n')

async function runAudit() {
  const testSecret =
    process.env.JWT_SECRET ||
    'development-default-jwt-secret-do-not-use-in-production-32chars!'
  const validTestToken = jwt.sign(
    { userId: '650000000000000000000001' },
    testSecret,
    { expiresIn: '1h' }
  )

  // 1. Health checks & Security Headers
  console.log('--- 1. HTTP Security Headers & Health Endpoints ---')
  try {
    const res = await fetch(`${BASE_URL}/health`)
    assert.strictEqual(res.status, 200)

    const headers = res.headers
    assert.strictEqual(headers.get('x-content-type-options'), 'nosniff')
    assert.strictEqual(headers.get('x-frame-options'), 'DENY')
    assert.strictEqual(headers.get('x-xss-protection'), '1; mode=block')
    assert.strictEqual(
      headers.get('referrer-policy'),
      'strict-origin-when-cross-origin'
    )

    const body = await res.json()
    assert.strictEqual(body.status, 'ok')
    assert.strictEqual(body.service, 'RESurface Backend API')
    testPassed('GET /health returns 200 and all expected HTTP Security Headers')
  } catch (err) {
    testFailed('GET /health security headers check', err)
  }

  // 2. Zod Validation on live /api/v1/auth/register route
  console.log('\n--- 2. Live Route Zod Input Validation ---')
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // invalid: too short (< 2 chars)
        email: 'invalid-email',
        password: '123', // invalid: too short (< 6 chars)
      }),
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.strictEqual(body.error, 'Validation failed')
    assert.ok(Array.isArray(body.details))
    assert.ok(body.details.length >= 1)
    testPassed(
      'POST /api/v1/auth/register properly rejects invalid input with 400 Bad Request via Zod middleware'
    )
  } catch (err) {
    testFailed('POST /api/v1/auth/register Zod validation check', err)
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: '',
      }),
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.strictEqual(body.error, 'Validation failed')
    testPassed(
      'POST /api/v1/auth/login properly rejects invalid email/password with 400 Bad Request'
    )
  } catch (err) {
    testFailed('POST /api/v1/auth/login Zod validation check', err)
  }

  // 3. File Signature Validation on live /api/v1/screenshots/upload route
  console.log('\n--- 3. Live Route File Signature Validation (Anti-MIME-Spoofing) ---')
  try {
    // Construct multipart form with spoofed file: Content-Type image/png, but bytes are Windows PE executable MZ
    const boundary = '----WebKitFormBoundarySecurityAuditTest123'
    const exeHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

    const partHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="screenshot"; filename="trojan.png"\r\nContent-Type: image/png\r\n\r\n`
    )
    const partFooter = Buffer.from(`\r\n--${boundary}--\r\n`)
    const multipartBody = Buffer.concat([partHeader, exeHeader, partFooter])

    const res = await fetch(`${BASE_URL}/api/v1/screenshots/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validTestToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.strictEqual(body.error, 'File signature validation failed')
    testPassed(
      'POST /api/v1/screenshots/upload stops spoofed MIME-type executable before reaching Cloudinary/OCR (HTTP 400)'
    )
  } catch (err) {
    testFailed('Live Route File Signature Validation check', err)
  }

  // 4. Rate Limiting enforcement on /api/v1/auth/login
  console.log('\n--- 4. Live Route Rate Limiting Enforcement ---')
  try {
    // Auth limiter allows 20 requests per 15 min. We have already made 1 request to /auth/login.
    // Let's fire 22 rapid requests to trigger 429 Too Many Requests.
    let hit429 = false
    let retryAfterHeader = null

    for (let i = 0; i < 22; i++) {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `user${i}@test.com`, password: 'pw' }),
      })

      if (res.status === 429) {
        hit429 = true
        retryAfterHeader = res.headers.get('retry-after')
        const body = await res.json()
        assert.strictEqual(body.error, 'Too Many Requests')
        break
      }
    }

    assert.strictEqual(hit429, true)
    assert.ok(retryAfterHeader !== null)
    testPassed(
      `POST /api/v1/auth/login throttles excessive requests with HTTP 429 Too Many Requests (Retry-After: ${retryAfterHeader}s)`
    )
  } catch (err) {
    testFailed('Live Route Rate Limiting check', err)
  }

  // 5. Zod Validation on live /api/v1/calendar route
  console.log('\n--- 5. Live Route Calendar Validation ---')
  try {
    const res = await fetch(`${BASE_URL}/api/v1/calendar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validTestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // missing title
        date: '2026-10-15T12:00:00.000Z',
      }),
    })

    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.success, false)
    assert.strictEqual(body.error, 'Validation failed')
    testPassed(
      'POST /api/v1/calendar validates input schema and returns 400 when required fields are missing'
    )
  } catch (err) {
    testFailed('Live Route Calendar Validation check', err)
  }

  console.log('\n==================================================')
  console.log(`📊 INTEGRATION AUDIT: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`)
  console.log('==================================================')

  if (passedTests === totalTests) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

// Give server a brief tick to listen
setTimeout(runAudit, 500)
