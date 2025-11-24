import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enhanced AI Content Generation
 * Production-grade prompt engineering for educational content
 */
/**
 * Enhanced AI Content Generation
 * Production-grade prompt engineering for educational content
 */

export const generateContent = async (text, difficulty = 'medium') => {
  try {
    console.log('🤖 Generating content with AI...');

    if (!text || text.trim().length < 50) {
      throw new Error('Text is too short. Please provide at least 50 characters.');
    }

    const difficultyInstructions = {
      easy: 'Use simple, clear language suitable for beginners.',
      medium: 'Balance between simple and technical language.',
      hard: 'Use technical language and advanced concepts.'
    };

    const prompt = `
You are an expert educational content creator.

TEXT TO ANALYZE:
${text}

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyInstructions[difficulty]}

Create a structured learning document with:

1. SUMMARY containing:
   - introduction: 1-2 paragraph overview
   - tableOfContents: Array of 4-6 section titles
   - sections: Array with {title, content} where content uses markdown
   - keyTakeaways: Array of 3-5 key points
   - conclusion: Final paragraph

2. QUIZ: 5-8 multiple choice questions

3. FLASHCARDS: 8-12 cards

4. MIND MAP: Hierarchical structure
   - Central Title: Max 50 chars
   - Branches: 4-6 main themes (max 30 chars each)
   - Items: 2-4 key points per branch (max 50 chars each)
   - Colors: #FF6B6B, #4ECDC4, #95E1D3, #F38181, #A8E6CF, #FFD3B6

FORMAT RULES:
- Single line breaks between paragraphs
- Markdown: ###, **, -, \`\`\`
- Clean, professional content

Return ONLY valid JSON:
{
  "title": "Content title",
  "summary": {
    "introduction": "Text",
    "tableOfContents": ["Section 1", "Section 2", ...],
    "sections": [{"title": "Title", "content": "Markdown content"}],
    "keyTakeaways": ["Point 1", ...],
    "conclusion": "Text"
  },
  "quiz": [{
    "question": "?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "Why"
  }],
  "flashcards": [{"question": "Q", "answer": "A"}],
  "mindMap": {
    "title": "Main Topic",
    "branches": [
      {
        "title": "Branch Name",
        "color": "#FF6B6B",
        "items": ["Point 1", "Point 2"]
      }
    ]
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Expert educational content creator. Always return valid JSON with complete summary object.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 6000
    });

    const content = JSON.parse(response.choices[0].message.content);

    // Validate
    if (!content.summary || !content.quiz || !content.flashcards || !content.mindMap) {
      throw new Error('Invalid AI response - missing required fields');
    }

    // Clean text
    const cleanText = (text) => {
      if (!text) return text;
      return text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {3,}/g, ' ')
        .trim();
    };

    if (content.summary.introduction) {
      content.summary.introduction = cleanText(content.summary.introduction);
    }
    if (content.summary.sections) {
      content.summary.sections = content.summary.sections.map(s => ({
        ...s,
        content: cleanText(s.content)
      }));
    }
    if (content.summary.conclusion) {
      content.summary.conclusion = cleanText(content.summary.conclusion);
    }

    console.log('✅ Content generated!');
    console.log(`   Title: ${content.title}`);
    console.log(`   Sections: ${content.summary.sections?.length || 0}`);
    console.log(`   Quiz: ${content.quiz.length}`);
    console.log(`   Flashcards: ${content.flashcards.length}`);
    console.log(`   Mind Map Branches: ${content.mindMap.branches?.length || 0}`);

    return {
      title: content.title,
      summary: content.summary, // JSONB object
      quiz: content.quiz,
      flashcards: content.flashcards,
      mindMap: content.mindMap,
      metadata: {
        model: 'gpt-4o-mini',
        difficulty,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ AI error:', error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
};


/**
 * Clean text - remove excessive newlines and whitespace
 */
function cleanText(text) {
  if (!text) return text;

  return text
    // Replace 3+ newlines with double newline
    .replace(/\n{3,}/g, '\n\n')
    // Replace excessive spaces
    .replace(/ {3,}/g, '  ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Estimate word count
 */
function estimateWordCount(summary) {
  let text = '';

  if (summary.introduction) text += summary.introduction + ' ';
  if (summary.sections) {
    summary.sections.forEach(s => {
      text += s.content + ' ';
    });
  }
  if (summary.conclusion) text += summary.conclusion + ' ';

  return text.split(/\s+/).filter(w => w.length > 0).length;
}


// Extract YouTube transcript (placeholder for Week 2)
export const extractYouTubeTranscript = async (url) => {
  throw new Error('YouTube extraction not implemented yet. Coming in Week 2!');
};

// Extract PDF text (placeholder for Week 3)
export const extractPdfText = async (fileBuffer) => {
  throw new Error('PDF extraction not implemented yet. Coming in Week 3!');
};

// Transcribe audio (placeholder for Week 4)
export const transcribeAudio = async (audioBuffer) => {
  throw new Error('Audio transcription not implemented yet. Coming in Week 4!');
};

// Extract text from image (placeholder for Week 4)
export const extractImageText = async (imageUrl) => {
  throw new Error('Image OCR not implemented yet. Coming in Week 4!');
};

export default {
  generateContent,
  extractYouTubeTranscript,
  extractPdfText,
  transcribeAudio,
  extractImageText
};