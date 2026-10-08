import { GoogleGenerativeAI } from '@google/generative-ai'
import logger from '../../utils/logger.js'

/**
 * Fetch an image from a URL and return it as a base64-encoded string
 * with MIME type.
 */
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      logger.warn(
        `Failed to fetch image from URL: ${response.status} ${response.statusText}`
      )
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return {
      base64,
      mimeType: contentType.split(';')[0].trim(),
    }
  } catch (error) {
    logger.error(`Error fetching image for Vision AI: ${error.message}`)
    return null
  }
}

/**
 * Read a local file as base64.
 */
const readLocalFileAsBase64 = async (filePath) => {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString('base64')

    const ext = path.extname(filePath).toLowerCase()

    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
    }

    const mimeType = mimeMap[ext] || 'image/png'

    return {
      base64,
      mimeType,
    }
  } catch (error) {
    logger.error(`Error reading image for Vision AI: ${error.message}`)
    return null
  }
}

/**
 * Detect sensitive information using the OCR text.
 *
 * This is a fallback safety net when Gemini is unavailable.
 *
 * IMPORTANT:
 * This function only decides whether content appears sensitive.
 * It does not store the actual detected secret.
 */
const detectSensitiveInformation = (text) => {
  if (!text) {
    return {
      isSensitive: false,
      sensitiveType: 'none',
    }
  }

  const lower = text.toLowerCase()

  /*
   * Password / login / credentials
   */
  const passwordKeywords = [
    'password',
    'passwd',
    'passcode',
    'login password',
    'username and password',
    'credentials',
    'login credentials',
    'secret key',
  ]

  if (passwordKeywords.some((keyword) => lower.includes(keyword))) {
    return {
      isSensitive: true,
      sensitiveType: 'password',
    }
  }

  /*
   * Card information
   */
  const cardKeywords = [
    'credit card',
    'debit card',
    'card number',
    'cvv',
    'cvc',
    'expiry date',
    'valid thru',
    'valid through',
    'cardholder',
  ]

  if (cardKeywords.some((keyword) => lower.includes(keyword))) {
    return {
      isSensitive: true,
      sensitiveType: 'card',
    }
  }

  /*
   * Bank information
   */
  const bankKeywords = [
    'bank account',
    'account number',
    'ifsc',
    'ifsc code',
    'bank statement',
    'account holder',
    'upi id',
    'upi pin',
  ]

  if (bankKeywords.some((keyword) => lower.includes(keyword))) {
    return {
      isSensitive: true,
      sensitiveType: 'bank',
    }
  }

  /*
   * Government identification
   */
  const governmentIdKeywords = [
    'aadhaar',
    'aadhar',
    'pan card',
    'pan number',
    'passport number',
    'driving licence',
    'driving license',
    'voter id',
    'voter card',
    'government id',
    'government identity',
  ]

  if (
    governmentIdKeywords.some((keyword) => lower.includes(keyword))
  ) {
    return {
      isSensitive: true,
      sensitiveType: 'government_id',
    }
  }

  /*
   * Authentication / verification information
   */
  const authenticationKeywords = [
    'otp',
    'one time password',
    'verification code',
    'authentication code',
    'security code',
    '2fa code',
    'two factor authentication',
    'verification otp',
  ]

  if (
    authenticationKeywords.some((keyword) => lower.includes(keyword))
  ) {
    return {
      isSensitive: true,
      sensitiveType: 'authentication',
    }
  }

  /*
   * Private key / highly sensitive technical credentials
   */
  const technicalSecretKeywords = [
    'private key',
    'api key',
    'access token',
    'secret key',
    'bearer token',
    'ssh key',
  ]

  if (
    technicalSecretKeywords.some((keyword) => lower.includes(keyword))
  ) {
    return {
      isSensitive: true,
      sensitiveType: 'other',
    }
  }

  return {
    isSensitive: false,
    sensitiveType: 'none',
  }
}

/**
 * Regex-based rule-based fallback entity extractor
 * when AI key is absent or API fails.
 */
const fallbackEntityExtraction = (text) => {
  if (!text) {
    return {
      title: 'Untitled Screenshot',
      summary: 'No text extracted from screenshot.',
      category: 'Other',
      tags: [],
      isSensitive: false,
      sensitiveType: 'none',
      entities: {
        dates: [],
        amounts: [],
        urls: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        names: [],
      },
      extractedDates: [],
      extractedTasks: [],
      extractedEvents: [],
      actionItems: [],
    }
  }

  // Regex patterns
  const dateRegex =
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi

  const amountRegex =
    /(?:[$₹€£] ?\d+(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:\.\d{2})? (?:USD|INR|EUR|GBP)\b)/gi

  const urlRegex = /https?:\/\/[^\s]+/gi

  const emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

  const phoneRegex =
    /\b(?:\+?\d{1,3}[- .]?)?\(?\d{3}\)?[- .]?\d{3}[- .]?\d{4}\b/g

  const dates = Array.from(new Set(text.match(dateRegex) || []))
  const amounts = Array.from(new Set(text.match(amountRegex) || []))
  const urls = Array.from(new Set(text.match(urlRegex) || []))
  const emails = Array.from(new Set(text.match(emailRegex) || []))
  const phoneNumbers = Array.from(
    new Set(text.match(phoneRegex) || [])
  )

  // Basic category detection
  let category = 'Other'
  const lower = text.toLowerCase()

  if (
    lower.includes('total') ||
    lower.includes('receipt') ||
    lower.includes('invoice') ||
    amounts.length > 0
  ) {
    category = 'Finance'
  } else if (
    lower.includes('ticket') ||
    lower.includes('flight') ||
    lower.includes('boarding') ||
    lower.includes('booking')
  ) {
    category = 'Travel'
  } else if (
    lower.includes('meeting') ||
    lower.includes('event') ||
    lower.includes('conference')
  ) {
    category = 'Events'
  } else if (
    lower.includes('assignment') ||
    lower.includes('homework') ||
    lower.includes('exam') ||
    lower.includes('lecture') ||
    lower.includes('notes')
  ) {
    category = 'Study'
  } else if (
    lower.includes('function') ||
    lower.includes('const') ||
    lower.includes('import') ||
    lower.includes('class')
  ) {
    category = 'Documents'
  } else if (
    lower.includes('cart') ||
    lower.includes('buy') ||
    lower.includes('price') ||
    lower.includes('order')
  ) {
    category = 'Shopping'
  }

  const firstLine =
    text
      .split('\n')
      .filter((line) => line.trim().length > 0)[0] ||
    'Screenshot Document'

  const title = firstLine.slice(0, 60)

  const summary = text
    .slice(0, 200)
    .replace(/\s+/g, ' ')

  // Detect sensitive information from OCR
  const sensitiveResult = detectSensitiveInformation(text)

  return {
    title,
    summary,
    category,

    tags: [category.toLowerCase()],

    isSensitive: sensitiveResult.isSensitive,
    sensitiveType: sensitiveResult.sensitiveType,

    entities: {
      dates,
      amounts,
      urls,
      emails,
      phoneNumbers,
      addresses: [],
      names: [],
    },

    extractedDates: dates.map((d) => ({
      dateText: d,
      context: 'Detected in text',
    })),

    extractedTasks: [],

    extractedEvents: [],

    actionItems: dates.map((d) => ({
      type: 'reminder',
      description: `Event / Deadline detected for ${d}`,
      dueDate: null,
      amount: amounts[0] || null,
      isCompleted: false,
    })),
  }
}

/**
 * Analyze a screenshot using Gemini's multimodal vision capabilities.
 *
 * Sends the actual image + OCR text context.
 */
export const analyzeScreenshotWithVision = async ({
  imageUrl,
  localPath,
  ocrText,
  buffer,
  mimeType,
}) => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    logger.info(
      'GEMINI_API_KEY not set — using rule-based text structuring fallback.'
    )

    return fallbackEntityExtraction(ocrText)
  }

  // Prepare image data for Gemini Vision
  let imageData = null

  if (imageUrl && imageUrl.startsWith('http')) {
    imageData = await fetchImageAsBase64(imageUrl)
  }

  if (!imageData && buffer) {
    imageData = {
      base64: Buffer.isBuffer(buffer)
        ? buffer.toString('base64')
        : buffer,
      mimeType: mimeType || 'image/png',
    }
  }

  if (!imageData && localPath) {
    imageData = await readLocalFileAsBase64(localPath)
  }

  if (!imageData) {
    logger.warn(
      'Could not load image for Vision AI — falling back to text-only analysis.'
    )

    return analyzeTextOnly(ocrText, apiKey)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
    })

    const prompt = buildVisionPrompt(ocrText)

    const imagePart = {
      inlineData: {
        data: imageData.base64,
        mimeType: imageData.mimeType,
      },
    }

    logger.info(
      'Sending image + OCR text to Gemini Vision AI for multimodal analysis...'
    )

    const result = await model.generateContent([
      prompt,
      imagePart,
    ])

    const responseText = result.response.text().trim()

    return parseAIResponse(responseText, ocrText)
  } catch (error) {
    logger.error(
      'Gemini Vision AI multimodal analysis failed:',
      error.message
    )

    // Try text-only fallback with AI
    try {
      return await analyzeTextOnly(ocrText, apiKey)
    } catch (_fallbackError) {
      logger.error(
        'Text-only AI fallback also failed, using regex parser.'
      )

      return fallbackEntityExtraction(ocrText)
    }
  }
}

/**
 * Text-only AI analysis fallback.
 */
const analyzeTextOnly = async (ocrText, apiKey) => {
  if (!ocrText || ocrText.trim().length === 0) {
    return fallbackEntityExtraction(ocrText)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
    })

    const prompt = buildTextOnlyPrompt(ocrText)

    const result = await model.generateContent(prompt)

    const responseText = result.response.text().trim()

    return parseAIResponse(responseText, ocrText)
  } catch (error) {
    logger.error(
      'Text-only Gemini analysis failed:',
      error.message
    )

    return fallbackEntityExtraction(ocrText)
  }
}

/**
 * Build the multimodal vision prompt.
 */
const buildVisionPrompt = (ocrText) => {
  return `You are an AI processing engine for RESecure (AI Screenshot Intelligence Platform).

You will receive an ACTUAL IMAGE/SCREENSHOT and optional OCR-extracted text.

Your task: Analyze the IMAGE VISUALLY and understand what it shows. Use the OCR text as supplementary context, but rely primarily on what you SEE in the image.

Respond with ONLY valid JSON (no markdown, no backticks, no explanation) matching this exact schema:

{
  "title": "Short descriptive title describing what the image is about (3-8 words). Examples: 'TCP Congestion Control Notes', 'Flight Booking Confirmation', 'Amazon Laptop Price Comparison'. Do NOT use generic titles like 'Screenshot' or 'Image' or 'Untitled'.",

  "summary": "1-3 sentence concise summary explaining what the image contains and what it is about. Be specific and informative.",

  "category": "One of: Study, Work, Shopping, Travel, Finance, Personal, Notes, Events, Documents, Other",

  "isSensitive": false,

  "sensitiveType": "none",

  "tags": ["array", "of", "relevant", "specific", "keywords", "max 8 tags"],

  "entities": {
    "dates": ["date strings found in the image"],
    "amounts": ["monetary values found"],
    "urls": ["web URLs visible"],
    "emails": ["email addresses visible"],
    "phoneNumbers": ["phone numbers visible"],
    "addresses": ["physical addresses visible"],
    "names": ["people, company, or organization names"]
  },

  "extractedDates": [
    {
      "dateText": "the date as written/shown",
      "context": "what this date refers to"
    }
  ],

  "extractedTasks": [
    {
      "task": "description of the task or action item",
      "dueDate": "due date if mentioned, or null",
      "priority": "high, medium, or low"
    }
  ],

  "extractedEvents": [
    {
      "event": "event name or description",
      "date": "event date if mentioned, or null",
      "time": "event time if mentioned, or null",
      "location": "event location if mentioned, or null"
    }
  ],

  "actionItems": [
    {
      "type": "reminder or calendar or payment or todo",
      "description": "action item description",
      "amount": "amount if applicable or null"
    }
  ]
}

IMPORTANT RULES:

- The title MUST describe what the image is about, not be a generic label.
- Do NOT hallucinate or invent information not visible in the image.
- If a field has no data, use an empty array [].
- Only extract dates, tasks, events that are actually present.
- Category should match the actual content.
- Tags should be specific and relevant to the image.

SENSITIVE INFORMATION DETECTION:

Set "isSensitive" to true if the screenshot contains highly private or security-sensitive information.

Examples include:

- Passwords
- Login credentials
- Usernames together with passwords
- Credit card details
- Debit card details
- CVV/CVC
- Bank account numbers
- IFSC information
- UPI credentials or UPI PIN
- OTP or verification codes
- Authentication codes
- Aadhaar information
- PAN information
- Passport information
- Driving licence information
- Voter ID information
- Government ID information
- API keys
- Access tokens
- Private keys
- SSH keys
- Other highly sensitive personal or authentication information

For normal screenshots such as:

- Study notes
- Normal conversations
- General shopping pages
- Travel information
- General documents
- Non-sensitive receipts
- General websites

set "isSensitive" to false.

"sensitiveType" MUST be exactly one of:

- "password"
- "card"
- "bank"
- "government_id"
- "authentication"
- "personal"
- "other"
- "none"

If "isSensitive" is false, "sensitiveType" MUST be "none".

Do NOT put the actual password, card number, CVV, account number, OTP, or other secret value into the sensitiveType field.

The purpose of isSensitive and sensitiveType is only to classify the screenshot so RESecure can protect it.

${ocrText && ocrText.trim().length > 0
      ? `OCR Text (supplementary context from text extraction):
"""
${ocrText.slice(0, 3000)}
"""`
      : 'No OCR text was extracted from this image. Rely entirely on visual analysis.'
    }

Now analyze the provided image and respond with ONLY the JSON object.`
}

/**
 * Build a text-only prompt.
 */
const buildTextOnlyPrompt = (ocrText) => {
  return `You are an AI processing engine for RESecure (AI Screenshot Intelligence Platform).

Analyze the following text extracted from a screenshot via OCR and output ONLY valid JSON matching this schema:

{
  "title": "Short descriptive title (3-8 words) describing the content. Do NOT use generic titles.",

  "summary": "1-3 sentence concise summary of what this screenshot contains.",

  "category": "One of: Study, Work, Shopping, Travel, Finance, Personal, Notes, Events, Documents, Other",

  "isSensitive": false,

  "sensitiveType": "none",

  "tags": ["array", "of", "relevant", "keywords", "max 8"],

  "entities": {
    "dates": ["date strings found"],
    "amounts": ["monetary values found"],
    "urls": ["web URLs"],
    "emails": ["email addresses"],
    "phoneNumbers": ["phone numbers"],
    "addresses": ["physical addresses"],
    "names": ["people or company names"]
  },

  "extractedDates": [
    {
      "dateText": "date as written",
      "context": "what it refers to"
    }
  ],

  "extractedTasks": [
    {
      "task": "task description",
      "dueDate": "date or null",
      "priority": "high/medium/low"
    }
  ],

  "extractedEvents": [
    {
      "event": "event name",
      "date": "date or null",
      "time": "time or null",
      "location": "location or null"
    }
  ],

  "actionItems": [
    {
      "type": "reminder/calendar/payment/todo",
      "description": "description",
      "amount": "amount or null"
    }
  ]
}

SENSITIVE INFORMATION DETECTION:

Set "isSensitive" to true if the text contains:

- Passwords
- Login credentials
- Credit/debit card information
- CVV/CVC
- Bank account details
- IFSC information
- UPI credentials
- OTP or verification codes
- Aadhaar
- PAN
- Passport
- Driving licence
- Voter ID
- Government ID
- API keys
- Access tokens
- Private keys
- SSH keys
- Other highly sensitive personal or authentication information

For normal non-sensitive content, set:

"isSensitive": false,
"sensitiveType": "none"

"sensitiveType" MUST be exactly one of:

"password",
"card",
"bank",
"government_id",
"authentication",
"personal",
"other",
"none"

If isSensitive is false, sensitiveType must be "none".

Do NOT include the actual secret value in sensitiveType.

Do NOT invent information. Only extract what is present in the text.

If a field has no data, use an empty array [].

Extracted Screenshot Text:

"""
${ocrText || 'No text recognized.'}
"""`

}

/**
 * Parse the raw AI response text into a structured result object.
 */
const parseAIResponse = (responseText, ocrText) => {
  try {
    // Clean JSON block backticks if present
    const cleanedJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    const parsed = JSON.parse(cleanedJson)

    const sensitiveTypeAllowed = [
      'password',
      'card',
      'bank',
      'government_id',
      'authentication',
      'personal',
      'other',
      'none',
    ]

    const aiSensitive =
      parsed.isSensitive === true

    const aiSensitiveType =
      typeof parsed.sensitiveType === 'string' &&
        sensitiveTypeAllowed.includes(parsed.sensitiveType)
        ? parsed.sensitiveType
        : 'none'

    /*
     * Use AI detection first.
     *
     * If AI says not sensitive, also check OCR text with our
     * rule-based detector as a safety fallback.
     */
    const fallbackSensitive =
      detectSensitiveInformation(ocrText)

    const isSensitive =
      aiSensitive || fallbackSensitive.isSensitive

    let sensitiveType = aiSensitiveType

    if (
      isSensitive &&
      sensitiveType === 'none' &&
      fallbackSensitive.isSensitive
    ) {
      sensitiveType = fallbackSensitive.sensitiveType
    }

    return {
      title: parsed.title || 'Untitled Screenshot',

      summary: parsed.summary || '',

      category: validateCategory(parsed.category),

      isSensitive,

      sensitiveType,

      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 10)
        : [],

      entities: {
        dates: parsed.entities?.dates || [],
        amounts: parsed.entities?.amounts || [],
        urls: parsed.entities?.urls || [],
        emails: parsed.entities?.emails || [],
        phoneNumbers: parsed.entities?.phoneNumbers || [],
        addresses: parsed.entities?.addresses || [],
        names: parsed.entities?.names || [],
      },

      extractedDates: Array.isArray(parsed.extractedDates)
        ? parsed.extractedDates
        : [],

      extractedTasks: Array.isArray(parsed.extractedTasks)
        ? parsed.extractedTasks
        : [],

      extractedEvents: Array.isArray(parsed.extractedEvents)
        ? parsed.extractedEvents
        : [],

      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
        : [],
    }
  } catch (parseError) {
    logger.error(
      'Failed to parse AI JSON response:',
      parseError.message
    )

    logger.debug(
      'Raw AI response:',
      responseText.slice(0, 500)
    )

    return fallbackEntityExtraction(ocrText)
  }
}

/**
 * Validate category against allowed values.
 */
const validateCategory = (category) => {
  const allowed = [
    'Study',
    'Work',
    'Shopping',
    'Travel',
    'Finance',
    'Personal',
    'Notes',
    'Events',
    'Documents',
    'Other',
  ]

  if (category && allowed.includes(category)) {
    return category
  }

  // Try case-insensitive match
  if (category) {
    const match = allowed.find(
      (c) =>
        c.toLowerCase() === category.toLowerCase()
    )

    if (match) {
      return match
    }
  }

  return 'Other'
}

// Keep backward compatibility — export the old function name as well
export const analyzeScreenshotText = async (ocrText) => {
  return analyzeScreenshotWithVision({
    imageUrl: null,
    localPath: null,
    ocrText,
  })
}