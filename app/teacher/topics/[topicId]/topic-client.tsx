'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReleaseToggle from '@/components/release-toggle'
import LessonReleaseToggle from '@/components/lesson-release-toggle'
import AssignQuestionsButton from '@/components/assign-questions-button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TopicClient({ topicData }: any) {
  const [expandedSubtopic, setExpandedSubtopic] = useState<string | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Record<string, number>>({})

  const { title, component, subtopics, lessonReleaseIds } = topicData || {}
  const releaseSet = new Set((lessonReleaseIds as string[]) || [])

  const toggleSubtopic = (subtopicId: string) => {
    if (expandedSubtopic === subtopicId) {
      setExpandedSubtopic(null)
    } else {
      setExpandedSubtopic(subtopicId)
      if (!(subtopicId in selectedLesson)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSelectedLesson((prev: any) => ({ ...prev, [subtopicId]: 0 }))
      }
    }
  }

  const selectLesson = (subtopicId: string, lessonIdx: number) => {
    setSelectedLesson((prev: Record<string, number>) => ({ ...prev, [subtopicId]: lessonIdx }))
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teacher/topics" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to Topics
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Component J277/{component} &middot; {subtopics?.length || 0} subtopic{(subtopics?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(subtopics || []).map((subtopic: any) => {
          const isExpanded = expandedSubtopic === subtopic.id
          const lessonIdx = selectedLesson[subtopic.id] || 0
          const content = subtopic.lessons?.[lessonIdx]?.content_json

          return (
            <div key={subtopic.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* Subtopic header - clickable */}
              <button
                onClick={() => toggleSubtopic(subtopic.id)}
                className={`w-full text-left flex items-center gap-4 p-4 transition-all ${
                  isExpanded ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  {subtopic.order_number}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-medium text-gray-900 truncate">{subtopic.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {subtopic.lessonCount > 0
                      ? `${subtopic.lessonCount} lesson${subtopic.lessonCount !== 1 ? 's' : ''}`
                      : 'No lesson content yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ReleaseToggle subtopicId={subtopic.id} initiallyReleased={false} />
                  <svg className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Expanded lesson list */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Lesson cards */}
                  {subtopic.lessons?.length > 0 ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {subtopic.lessons.map((lesson: any, i: number) => {
                        const isSelected = i === lessonIdx
                        const isReleased = releaseSet.has(lesson.id)
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => selectLesson(subtopic.id, i)}
                            className={`w-full text-left flex items-center gap-4 rounded-lg border p-3 transition-all ${
                              isSelected
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                            }`}
                          >
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {lesson.order_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                {lesson.title}
                              </p>
                            </div>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <div onClick={(e: any) => e.stopPropagation()} className="flex-shrink-0">
                              <LessonReleaseToggle
                                lessonId={lesson.id}
                                lessonTitle={lesson.title}
                                initiallyReleased={isReleased}
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No lesson content yet.</p>
                  )}

                  {/* Assign questions button */}
                  {subtopic.lessons?.length > 0 && (
                    <AssignQuestionsButton subtopicId={subtopic.id} lessonIndex={lessonIdx} />
                  )}

                  {/* Selected lesson content */}
                  {content?.learning_objectives && (
                    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900">{subtopic.lessons[lessonIdx].title}</h3>
                        <span className="text-xs text-gray-500">Lesson {lessonIdx + 1}</span>
                      </div>

                      <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Learning Objectives</h4>
                        <ul className="space-y-1.5">
                          {(content.learning_objectives as string[]).map((obj: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 mt-0.5">{i + 1}</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Explanation</h4>
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {(content.explanation as string)
                            ? content.explanation.split('\n').map((line: string, i: number) => {
                                if (line.startsWith('## '))
                                  return <h5 key={i} className="text-sm font-semibold text-gray-900 mt-3 mb-1">{line.replace('## ', '')}</h5>
                                if (line.startsWith('### '))
                                  return <h6 key={i} className="text-xs font-semibold text-gray-800 mt-2 mb-1">{line.replace('### ', '')}</h6>
                                if (line.trim() === '') return <br key={i} />
                                return <p key={i} className="mb-1 text-sm">{line}</p>
                              })
                            : <p className="text-gray-500 italic text-sm">No explanation available.</p>}
                        </div>
                      </section>

                      <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Points</h4>
                        <ul className="space-y-1.5">
                          {(content.key_points as string[]).map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <svg className="h-4 w-4 flex-shrink-0 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </section>

                      {(content.examples as string[])?.length > 0 && (
                        <section>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Examples</h4>
                          <div className="space-y-2">
                            {(content.examples as string[]).map((example: string, i: number) => (
                              <div key={i} className="rounded-md bg-amber-50 border border-amber-200 p-3">
                                <p className="text-xs font-medium text-amber-800 mb-0.5">Example {i + 1}</p>
                                <p className="text-xs text-amber-900">{example}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {(content.common_misconceptions as string[])?.length > 0 && (
                        <section>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Common Misconceptions</h4>
                          <div className="space-y-2">
                            {(content.common_misconceptions as string[]).map((mc: string, i: number) => (
                              <div key={i} className="rounded-md bg-red-50 border border-red-200 p-3">
                                <p className="text-xs font-medium text-red-800 mb-0.5">Misconception {i + 1}</p>
                                <p className="text-xs text-red-700">{mc}</p>
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
        })}
      </div>

      {(!subtopics || subtopics.length === 0) && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No subtopics found for this topic.</p>
        </div>
      )}
    </div>
  )
}
