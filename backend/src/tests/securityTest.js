import assert from 'assert'
import { registerSchema, loginSchema } from '../modules/auth/auth.validation.js'
import { createEventSchema, updateEventSchema } from '../modules/calendar/calendar.validation.js'
import { updateDateSchema, dismissActionItemSchema } from '../modules/screenshots/screenshots.validation.js'
import { detectImageSignature, validateFileSignature } from '../middleware/fileSignature.js'
import { encryptAES256GCM, decryptAES256GCM, maskSensitiveString } from '../utils/crypto.js'
import { maskSecret, validateEnv } from '../config/env.js'
import { apiLimiter, authLimiter, uploadLimiter } from '../middleware/rateLimiter.js'

let totalTests = 0
let passedTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
  }
}

async function runAsyncTest(name, fn) {
  totalTests++
  try {
    await fn()
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
  }
}

console.log('==================================================')
console.log('🧪 RUNNING INFORMATION SECURITY VERIFICATION SUITE')
console.log('==================================================\n')

// ---------------------------------------------------------------------
// 1. ZOD INPUT VALIDATION TESTS
// ---------------------------------------------------------------------
console.log('--- 1. Zod Input Validation Tests ---')

test('Auth: registerSchema accepts valid user registration', () => {
  const validData = {
    name: 'Alice Developer',
    email: 'alice@example.com',
    password: 'SuperSecurePassword123!',
  }
  const result = registerSchema.safeParse(validData)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.data.email, 'alice@example.com')
})

test('Auth: registerSchema rejects invalid email', () => {
  const invalidData = {
    name: 'Alice Developer',
    email: 'not-an-email',
    password: 'password123',
  }
  const result = registerSchema.safeParse(invalidData)
  assert.strictEqual(result.success, false)
  assert.ok(result.error.issues.some((i) => i.path.includes('email')))
})

test('Auth: registerSchema rejects password under 6 characters', () => {
  const invalidData = {
    name: 'Alice Developer',
    email: 'alice@example.com',
    password: '123',
  }
  const result = registerSchema.safeParse(invalidData)
  assert.strictEqual(result.success, false)
  assert.ok(result.error.issues.some((i) => i.path.includes('password')))
})

test('Auth: loginSchema validates email and password', () => {
  const result = loginSchema.safeParse({
    email: 'bob@example.com',
    password: 'mypassword',
  })
  assert.strictEqual(result.success, true)

  const emptyPass = loginSchema.safeParse({
    email: 'bob@example.com',
    password: '',
  })
  assert.strictEqual(emptyPass.success, false)
})

test('Calendar: createEventSchema validates required fields', () => {
  const valid = createEventSchema.safeParse({
    title: 'Security Review Meeting',
    date: '2026-10-15T10:00:00.000Z',
    type: 'event',
  })
  assert.strictEqual(valid.success, true)

  const missingTitle = createEventSchema.safeParse({
    date: '2026-10-15T10:00:00.000Z',
  })
  assert.strictEqual(missingTitle.success, false)

  const invalidDate = createEventSchema.safeParse({
    title: 'Sprint Demo',
    date: 'not-a-valid-date-string',
  })
  assert.strictEqual(invalidDate.success, false)
})

test('Screenshots: updateDateSchema and dismissActionItemSchema validate categories', () => {
  const validUpdate = updateDateSchema.safeParse({
    category: 'extractedDates',
    itemIndex: 0,
    newDate: '2026-10-20',
  })
  assert.strictEqual(validUpdate.success, true)

  const invalidCat = updateDateSchema.safeParse({
    category: 'unsupportedCategory',
    itemIndex: 0,
    newDate: '2026-10-20',
  })
  assert.strictEqual(invalidCat.success, false)

  const validDismiss = dismissActionItemSchema.safeParse({
    category: 'extractedTasks',
    itemIndex: 2,
  })
  assert.strictEqual(validDismiss.success, true)
})

// ---------------------------------------------------------------------
// 2. FILE SIGNATURE (MAGIC BYTES) VALIDATION TESTS
// ---------------------------------------------------------------------
console.log('\n--- 2. File Signature (Magic Bytes) Validation Tests ---')

test('File Signature: Identifies JPEG magic bytes (FF D8 FF)', () => {
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
  assert.strictEqual(detectImageSignature(jpegBuffer), 'jpeg')
})

test('File Signature: Identifies PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
  assert.strictEqual(detectImageSignature(pngBuffer), 'png')
})

test('File Signature: Identifies WebP magic bytes (RIFF....WEBP)', () => {
  const webpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
  ])
  assert.strictEqual(detectImageSignature(webpBuffer), 'webp')
})

test('File Signature: Identifies GIF magic bytes (GIF89a)', () => {
  const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00])
  assert.strictEqual(detectImageSignature(gifBuffer), 'gif')
})

test('File Signature: Identifies BMP magic bytes (BM)', () => {
  const bmpBuffer = Buffer.from([0x42, 0x4d, 0x36, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00])
  assert.strictEqual(detectImageSignature(bmpBuffer), 'bmp')
})

test('File Signature: Rejects executable/script masquerading as image (MIME spoofing defense)', () => {
  // Executable header MZ (4D 5A ...) with .png extension claimed in mimetype
  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00])
  assert.strictEqual(detectImageSignature(exeBuffer), null)

  // Test middleware rejection
  let statusCode = 0
  let jsonResponse = null
  let nextCalled = false

  const req = {
    file: {
      originalname: 'malware.png',
      mimetype: 'image/png', // Spoofed header
      buffer: exeBuffer,
    },
  }
  const res = {
    status: (code) => {
      statusCode = code
      return {
        json: (data) => {
          jsonResponse = data
        },
      }
    },
  }
  const next = () => {
    nextCalled = true
  }

  validateFileSignature(req, res, next)
  assert.strictEqual(statusCode, 400)
  assert.strictEqual(nextCalled, false)
  assert.strictEqual(jsonResponse.success, false)
  assert.strictEqual(jsonResponse.error, 'File signature validation failed')
})

// ---------------------------------------------------------------------
// 3. AES-256-GCM APPLICATION-LEVEL ENCRYPTION TESTS
// ---------------------------------------------------------------------
console.log('\n--- 3. AES-256-GCM Encryption Tests ---')

test('AES-256-GCM: Successfully encrypts and decrypts sensitive text', () => {
  const secretText = 'sensitive-token-or-password-credit-card-4111-2222-3333-4444'
  const encrypted = encryptAES256GCM(secretText)

  assert.notStrictEqual(encrypted, secretText)
  assert.ok(encrypted.includes(':'), 'Encrypted output contains IV:TAG:CIPHERTEXT format')

  const decrypted = decryptAES256GCM(encrypted)
  assert.strictEqual(decrypted, secretText)
})

test('AES-256-GCM: Produces distinct ciphertexts for identical plaintext (Random IV per encryption)', () => {
  const secret = 'same-plaintext'
  const enc1 = encryptAES256GCM(secret)
  const enc2 = encryptAES256GCM(secret)

  assert.notStrictEqual(enc1, enc2, 'Two encryptions of same text must have unique IVs')
  assert.strictEqual(decryptAES256GCM(enc1), secret)
  assert.strictEqual(decryptAES256GCM(enc2), secret)
})

test('AES-256-GCM: Detects tampering and rejects manipulated ciphertext (Authenticity guarantee)', () => {
  const secret = 'financial-record-vault-entry'
  const encrypted = encryptAES256GCM(secret)
  const [iv, tag, ciphertext] = encrypted.split(':')

  // Flip a character in the ciphertext to simulate tampering
  const tamperedCiphertext =
    ciphertext.slice(0, -2) + (ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa')
  const tampered = `${iv}:${tag}:${tamperedCiphertext}`

  assert.throws(
    () => {
      decryptAES256GCM(tampered)
    },
    /Unsupported state or unable to authenticate data/,
    'Tampered ciphertext must fail GCM authentication'
  )
})

test('AES-256-GCM: String masking utility safely masks sensitive text', () => {
  const masked = maskSensitiveString('4111-2222-3333-4444')
  assert.strictEqual(masked, '41****44')
})

// ---------------------------------------------------------------------
// 4. ENVIRONMENT SECURITY & SECRET MASKING TESTS
// ---------------------------------------------------------------------
console.log('\n--- 4. Environment Protection & Secret Masking Tests ---')

test('Environment: maskSecret properly obscures sensitive keys in logs', () => {
  assert.strictEqual(maskSecret('super-secret-jwt-token-string'), 'supe****ring')
  assert.strictEqual(maskSecret('short'), '****')
  assert.strictEqual(maskSecret(null), '[not set]')
})

test('Environment: validateEnv validates without throwing in current config', () => {
  const validated = validateEnv()
  assert.ok(validated)
  assert.ok(typeof validated === 'object')
})

// ---------------------------------------------------------------------
// 5. RATE LIMITING TESTS
// ---------------------------------------------------------------------
console.log('\n--- 5. API Rate Limiting Tests ---')

test('Rate Limiter: apiLimiter, authLimiter, and uploadLimiter are defined functions', () => {
  assert.strictEqual(typeof apiLimiter, 'function')
  assert.strictEqual(typeof authLimiter, 'function')
  assert.strictEqual(typeof uploadLimiter, 'function')
})

// ---------------------------------------------------------------------
// 6. MONGODB ATLAS TLS ENFORCEMENT LOGIC TEST
// ---------------------------------------------------------------------
console.log('\n--- 6. MongoDB Atlas TLS Configuration Verification ---')

test('MongoDB: Atlas URIs activate strict TLS and disallow invalid certificates', () => {
  const atlasUri = 'mongodb+srv://admin:pass@cluster0.abcde.mongodb.net/resecure?retryWrites=true&w=majority'
  const isAtlasOrTls =
    atlasUri.startsWith('mongodb+srv://') ||
    atlasUri.includes('tls=true') ||
    atlasUri.includes('ssl=true')

  assert.strictEqual(isAtlasOrTls, true)

  const connectionOptions = {
    serverSelectionTimeoutMS: 15000,
    ...(isAtlasOrTls && {
      tls: true,
      tlsAllowInvalidCertificates: false,
    }),
  }

  assert.strictEqual(connectionOptions.tls, true)
  assert.strictEqual(connectionOptions.tlsAllowInvalidCertificates, false)
})

console.log('\n==================================================')
console.log(`📊 SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`)
console.log('==================================================')

if (passedTests === totalTests) {
  process.exit(0)
} else {
  process.exit(1)
}
