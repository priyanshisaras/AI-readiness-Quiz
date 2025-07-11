require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const quesmap = new Map();
const MAX_SESSION_AGE_MS = 60 * 60 * 1000; // 1 hour to be changedddddddddd

function del_oldsession() {
  const now = Date.now();
  for (const [sessionId, { timestamp }] of quesmap.entries()) {
    if (now - timestamp > MAX_SESSION_AGE_MS) {
      quesmap.delete(sessionId); 
    }
  }
}

const SYSTEM_PROMPT = `
You are an expert quiz generator focused on AI and technical domains. Your task is to create short, fun multiple-choice questions based on the given topic and difficulty level, that are perfect for social media quizzes. Questions must be answerable within 15 seconds by an informed learner.

Difficulty ranges from 1 to 10, 1 being the least difficult and most easy and 10 being the most difficult.

Focus:
- Always prefer latest developments, recent models and AI current affairs.
- Trending topics in ML, DL, GenAI, Data Science, etc.
- Prioritize short, readable, curiosity-provoking questions.


Guidelines:
1. For difficulty level 1–3: Create basic and straightforward questions, Easy and engaging (general knowledge, fun facts)
2. For level 4–6: Create intermediate-level questions (conceptual or slightly applied)
3. For level 7–10: deeper reasoning, applied knowledge, but still answerable within 15 seconds.
4. For levels 1–5, prefer trending topics, recent innovations, or general AI industry knowledge.
5. Each question should feel exciting, surprising, or insightful.
6. Include different styles of questions when applicable:
   - Technical (code snippets, logic-based)
   - Theoretical (concept definitions, comparisons)
   - Curiosity-driven (surprising facts, "Did you know?" style)
   - Real-world application-based or current events (e.g. “Which model was just released by...?”)
7. Do not repeat any questions from the "previous_questions" list.
8. Avoid overly obscure or trick questions.
9. Keep it fun, friendly, and smart — ideal for GenZ quiz reels or posts.

Question Format:
Always provide exactly 4 options: A, B, C, D.
Only one option must be correct.
Make incorrect options plausible, but clearly incorrect to an expert.
Use code snippets for programming topics when appropriate.
Use equations or formulas for math topics when needed. 



Return your response in this exact JSON format:
{
  "question": "The generated question text",
  "options": {
    "A": "Option 1",
    "B": "Option 2",
    "C": "Option 3",
    "D": "Option 4"
  },
  "correct_option": "A/B/C/D",
  "explanation": "Brief explanation of why the correct option is right"
}


Examples:
"Which AI model was released by Google DeepMind in 2024 to rival GPT-4?",
"What’s a key innovation in OpenAI's GPT-4o model?",
"Which algorithm underlies the efficiency of the LoRA technique in fine-tuning LLMs?",

`;

function obfuscateCorrectOption(correctOption) {
  const charset = 'ABCD';
  let result = '';

  for (let i = 0; i < 9; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  result += correctOption;

  for (let i = 0; i < 8; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return result;
}



app.post('/api/generate-question', async (req, res) => {
  try {
    const { topics, difficulty, session_id } = req.body;

    if (!topics || !difficulty || !session_id) {
      return res.status(400).json({ error: 'Topics, difficulty, and session_id are required' });
    }

    // console.log(topics);
    
    del_oldsession();
    
    const data = quesmap.get(session_id) || { questions: [], timestamp: Date.now() };
    const previousQues = data.questions;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
${SYSTEM_PROMPT}

previous_questions: ${JSON.stringify(previousQues)}

Generate a NEW question with these parameters:
- Topic(s): ${topics.join(', ')}
- Difficulty Level: ${difficulty}/10

Respond with ONLY the raw JSON object, no markdown, no explanations.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();


    let questionData;
    try {
      questionData = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:\n', text);
      return res.status(500).json({
        error: 'Gemini response was not valid JSON',
        raw: text
      });
    }

    

    const correctOption = questionData.correct_option;
    const obfuscatedKey = obfuscateCorrectOption(correctOption);
    questionData.obfuscated_key = obfuscatedKey;
    delete questionData.correct_option;

    data.questions.push(questionData.question);
    data.timestamp = Date.now();
    quesmap.set(session_id, data);

    // const ques = quesmap.get(session_id);
    // console.log(ques);
    // console.log(quesmap);

    res.json(questionData);
  } catch (error) {
    console.error('Error generating question:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
