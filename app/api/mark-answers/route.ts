import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'

interface AnswerItem {
  questionIndex: number
  answer: string
}

interface MarkedAnswer {
  questionIndex: number
  score: number
  feedback: string
  suggestions: string
}

async function markSingleAnswer(
  question: string,
  markScheme: string,
  studentAnswer: string,
  marks: number,
  attempt: number = 1
): Promise<{ score: number; feedback: string; suggestions: string }> {
  const prompt = `You are a strict GCSE examiner. Mark this student's answer against the mark scheme. Follow the mark scheme LITERALLY — if the answer contains what the mark scheme asks for, award the marks.

Question: ${question}
Mark scheme: ${markScheme}
Student answer: ${studentAnswer}
Marks available: ${marks}

CRITICAL RULES:
- Award marks EXACTLY as the mark scheme specifies. If the mark scheme says "1 mark for X", and the student mentions X, award 1 mark — even if the answer is brief.
- If the mark scheme lists parts (a, b, c, etc.), award the corresponding mark for each part the student addresses.
- The answer must be relevant to the question. An off-topic or blank answer gets 0.
- Do NOT penalise for brevity — if the answer contains the required content, award the marks regardless of length.
- Do NOT penalise for minor spelling, capitalisation, or punctuation differences — "abc", "ABC", "A B C" are the same answer.
- Award partial marks when the student addresses some but not all parts of the mark scheme.

Return JSON ONLY: {"score": number, "feedback": string, "suggestions": string}`

  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GITHUB_MODELS_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    if (response.status === 429 && attempt < 3) {
      // Rate limited - wait and retry with exponential backoff
      const delayMs = Math.min(2000 * attempt, 8000)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return markSingleAnswer(question, markScheme, studentAnswer, marks, attempt + 1)
    }
    const errorBody = await response.text()
    let errorMessage = `GitHub Models returned ${response.status}`
    try {
      const errorJson = JSON.parse(errorBody)
      if (errorJson.error?.message) {
        errorMessage += `: ${errorJson.error.message}`
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  const rawContent = data?.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error('Empty response from OpenRouter')
  }

  // Parse the JSON response
  let cleaned = rawContent.trim()
  if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  try {
    const result = JSON.parse(cleaned)
    return {
      score: typeof result.score === 'number' ? Math.max(0, Math.min(marks, result.score)) : 0,
      feedback: typeof result.feedback === 'string' ? result.feedback : 'No feedback provided.',
      suggestions: typeof result.suggestions === 'string' ? result.suggestions : 'No suggestions provided.',
    }
  } catch {
    throw new Error(`Failed to parse marking response: ${cleaned.substring(0, 200)}`)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  // CSRF check
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check user is a student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || profile.role !== 'student') {
    return NextResponse.json({ error: 'Only students can submit answers' }, { status: 403 })
  }

  const { questionSetId, answers }: { questionSetId: string; answers: AnswerItem[] } = await request.json()
  if (!questionSetId || !answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Missing questionSetId or answers array' }, { status: 400 })
  }

  // Fetch the question set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setList } = await (supabase.from('question_sets') as any)
    .select('*')
    .eq('id', questionSetId)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionSet = (setList as any[] | null)?.[0]
  if (!questionSet) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = questionSet.questions_json as any[]
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: 'Invalid question set data' }, { status: 500 })
  }

  // Mark each answer, with delay between calls for rate limiting
  const markedAnswers: MarkedAnswer[] = []
  const scores: number[] = []

  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i]
    const question = questions[answer.questionIndex]

    if (!question) {
      markedAnswers.push({
        questionIndex: answer.questionIndex,
        score: 0,
        feedback: 'Question not found.',
        suggestions: 'N/A',
      })
      scores.push(0)
      continue
    }

    // Add delay between API calls (except first) to avoid rate limiting
    if (i > 0) {
      await delay(1500)
    }

    try {
      const result = await markSingleAnswer(
        question.question,
        question.mark_scheme,
        answer.answer,
        question.marks
      )
      markedAnswers.push({
        questionIndex: answer.questionIndex,
        ...result,
      })
      scores.push(result.score)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      markedAnswers.push({
        questionIndex: answer.questionIndex,
        score: 0,
        feedback: `Marking failed: ${message}`,
        suggestions: 'Please try again or ask your teacher to review this answer manually.',
      })
      scores.push(0)
    }
  }

  const totalScore = scores.reduce((sum, s) => sum + s, 0)

  // Insert student answers into DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase.from('student_answers') as any)
    .insert({
      question_set_id: questionSetId,
      student_id: user.id,
      answers_json: answers,
      scores_json: scores,
      feedback_json: markedAnswers,
      total_score: totalScore,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save answers', details: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    result: inserted,
    markedAnswers,
    totalScore,
  })
}
