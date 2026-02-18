import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyB4mMlzrYZi7O5ydhJmYCTtK202LTxg4Gw";
const genAI = new GoogleGenerativeAI(API_KEY);

async function checkModels() {
  console.log("Checking gemini-pro...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello");
    console.log("gemini-pro: SUCCESS");
  } catch (e) {
    console.log("gemini-pro: FAILED", e.message);
  }

  console.log("Checking gemini-1.5-flash...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.5-flash: SUCCESS");
  } catch (e) {
    console.log("gemini-1.5-flash: FAILED", e.message);
  }
}

checkModels();
