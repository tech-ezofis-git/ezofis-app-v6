import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyB4mMlzrYZi7O5ydhJmYCTtK202LTxg4Gw'
const genAI = new GoogleGenerativeAI(API_KEY)

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    // There isn't a direct listModels on the instance in some versions, but let's try the generic way via API if strictly needed,
    // but the SDK typically exposes a way.
    // Actually, usually it's not directly on genAI instance in the simpler web SDK.
    // Let's just try to run a simple generation with 'gemini-pro' to see if that works as fallback.

    console.log('Trying gemini-pro...')
    const modelPro = genAI.getGenerativeModel({ model: 'gemini-pro' })
    const resultPro = await modelPro.generateContent('Hello')
    console.log('gemini-pro works:', resultPro.response.text())
  } catch (error) {
    console.error('Error:', error.message)
  }
}

listModels()
