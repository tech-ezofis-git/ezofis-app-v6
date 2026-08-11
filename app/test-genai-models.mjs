import { GoogleGenAI } from '@google/genai'

const apiKey = 'AIzaSyB4mMlzrYZi7O5ydhJmYCTtK202LTxg4Gw'
const ai = new GoogleGenAI({ apiKey })

async function testModels() {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-pro',
  ]

  for (const model of models) {
    console.log(`Testing model: ${model}...`)
    try {
      const response = await ai.models.generateContent({
        contents: [{ parts: [{ text: 'Hello' }], role: 'user' }],
        model: model,
      })
      console.log(`SUCCESS: ${model}`)
      console.log(response.text().substring(0, 50) + '...')
      return // Stop after first success
    } catch (error) {
      console.log(`FAILED: ${model} - ${error.message}`)
    }
  }
}

testModels()
