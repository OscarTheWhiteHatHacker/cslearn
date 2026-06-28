'use client'

import { useState } from 'react'
import Link from 'next/link'
import LessonReleaseToggle from '@/components/lesson-release-toggle'
import AssignQuestionsButton from '@/components/assign-questions-button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SubtopicClient(props: any) {
  const { subtopic, topic, lessons, releasedLessonIds, orgId } = props
  const releasedSet = new Set((releasedLessonIds as string[]) || [])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const content = lessons?.[selectedIdx]?.content_json

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/teacher/topics/${topic.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to {topic.title}
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subtopic.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              J277/{topic.component} &middot; {topic.title} &middot; {lessons?.length || 0} lessons
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AssignQuestionsButton subtopicId={subtopic.id} lessonIndex={selectedIdx} orgId={orgId} />
          </div>
        </div>
      </div>

      {/* Lesson list */}
      {!lessons || lessons.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">No lesson content yet</h2>
          <p className="mt-2 text-sm text-gray-500">Lesson content has not been generated for this subtopic yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lesson cards */}
          <div className="space-y-2">
            {lessons.map((lesson: { id: string; title: string; order_number: number }, i: number) => {
              const isSelected = i === selectedIdx
              const isReleased = releasedSet.has(lesson.id)
              return (
                <button
                  type="button"
                  key={lesson.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left flex items-center gap-4 rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-300 bg-accent-bg shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isSelected ? 'bg-accent-bg text-accent' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {lesson.order_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-base font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {lesson.title}
                    </h2>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <div onClick={(e: any) => e.stopPropagation()} className="flex-shrink-0">
                    <LessonReleaseToggle
                      lessonId={lesson.id}
                      initiallyReleased={isReleased}
                      orgId={orgId}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected lesson content */}
          {content?.learning_objectives && (
            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{lessons[selectedIdx]?.title}</h2>
                <span className="text-xs text-gray-500">Lesson {lessons[selectedIdx]?.order_number}</span>
              </div>

              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Learning Objectives</h3>
                <ul className="space-y-2">
                  {(content.learning_objectives as string[]).map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 mt-0.5">{i + 1}</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Explanation</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {(content.explanation as string)
                    ? content.explanation.split('\n').map((line: string, i: number) => {
                        if (line.startsWith('## '))
                          return <h4 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-2">{line.replace('## ', '')}</h4>
                        if (line.startsWith('### '))
                          return <h5 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">{line.replace('### ', '')}</h5>
                        if (line.trim() === '') return <br key={i} />
                        return <p key={i} className="mb-2">{line}</p>
                      })
                    : <p className="text-gray-500 italic">No explanation available.</p>}
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {(content.key_points as string[]).map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              {(content.examples as any[])?.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Examples</h3>
                  <div className="space-y-3">
                    {(content.examples as any[]).map((example: any, i: number) => (
                      <div key={i} className="rounded-md bg-amber-50 border border-amber-200 p-4">
                        <p className="text-xs font-medium text-amber-800 mb-1">Example {i + 1}</p>
                        {typeof example === 'string' ? (
                          <p className="text-sm text-amber-900">{example}</p>
                        ) : (
                          <div className="text-sm text-amber-900 space-y-1">
                            {example.question && <p><span className="font-medium">Question:</span> {example.question}</p>}
                            {example.answer && <p><span className="font-medium">Answer:</span> {example.answer}</p>}
                            {example.scenario && <p><span className="font-medium">Scenario:</span> {example.scenario}</p>}
                            {example.explanation && <p><span className="font-medium">Explanation:</span> {example.explanation}</p>}
                            {example.code && <pre className="mt-1 rounded bg-amber-100 p-2 text-xs font-mono whitespace-pre-wrap">{example.code}</pre>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(content.common_misconceptions as string[])?.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Common Misconceptions</h3>
                  <div className="space-y-3">
                    {(content.common_misconceptions as string[]).map((mc: string, i: number) => (
                      <div key={i} className="rounded-md bg-red-50 border border-red-200 p-4">
                        <p className="text-xs font-medium text-red-800 mb-1">Misconception {i + 1}</p>
                        <p className="text-sm text-red-700">{mc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
