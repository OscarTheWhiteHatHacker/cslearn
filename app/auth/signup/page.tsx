'use client'

import { useReducer, useEffect, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type RoleType = 'student' | 'teacher' | 'setup'
type SchoolAction = 'create' | 'join'

interface SignupState {
  step: number
  role: RoleType | null
  schoolAction: SchoolAction
  schoolName: string
  schoolSlug: string
  username: string
  password: string
  fullName: string
  error: string | null
  loading: boolean
  success: boolean
  successMessage: string
}

type SignupAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ROLE'; role: RoleType }
  | { type: 'SET_SCHOOL_ACTION'; action: SchoolAction }
  | { type: 'SET_SCHOOL_NAME'; name: string }
  | { type: 'SET_SCHOOL_SLUG'; slug: string }
  | { type: 'SET_USERNAME'; username: string }
  | { type: 'SET_PASSWORD'; password: string }
  | { type: 'SET_FULL_NAME'; fullName: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_SUCCESS'; message: string }
  | { type: 'RESET_ERROR' }

const initialState: SignupState = {
  step: 1,
  role: null,
  schoolAction: 'create',
  schoolName: '',
  schoolSlug: '',
  username: '',
  password: '',
  fullName: '',
  error: null,
  loading: false,
  success: false,
  successMessage: '',
}

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_ROLE':
      return { ...state, role: action.role }
    case 'SET_SCHOOL_ACTION':
      return { ...state, schoolAction: action.action }
    case 'SET_SCHOOL_NAME':
      return { ...state, schoolName: action.name }
    case 'SET_SCHOOL_SLUG':
      return { ...state, schoolSlug: action.slug }
    case 'SET_USERNAME':
      return { ...state, username: action.username }
    case 'SET_PASSWORD':
      return { ...state, password: action.password }
    case 'SET_FULL_NAME':
      return { ...state, fullName: action.fullName }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'RESET_ERROR':
      return { ...state, error: null }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_SUCCESS':
      return { ...state, success: true, successMessage: action.message }
    default:
      return state
  }
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (e.g. !@#$%^&*)'
  return null
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [state, dispatch] = useReducer(signupReducer, initialState)

  useEffect(() => {
    document.title = 'Sign Up | CSLearn'
  }, [])

  const { step, role, schoolAction, schoolName, schoolSlug, username, password, fullName, error, loading, success, successMessage } = state

  const isStudent = role === 'student'
  const isTeacher = role === 'teacher' || role === 'setup'

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSchoolNext = () => {
    dispatch({ type: 'RESET_ERROR' })
    if (schoolAction === 'create') {
      if (!schoolName.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'Please enter a school name' })
        return
      }
    } else {
      if (!schoolSlug.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'Please enter a school code' })
        return
      }
    }
    dispatch({ type: 'SET_STEP', step: 3 })
  }

  const handleRoleSelect = (selectedRole: RoleType) => {
    dispatch({ type: 'SET_ROLE', role: selectedRole })
    if (selectedRole === 'student') {
      dispatch({ type: 'SET_SCHOOL_ACTION', action: 'join' })
    } else if (selectedRole === 'setup') {
      dispatch({ type: 'SET_SCHOOL_ACTION', action: 'create' })
    } else {
      dispatch({ type: 'SET_SCHOOL_ACTION', action: 'create' })
    }
    dispatch({ type: 'SET_STEP', step: 2 })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'RESET_ERROR' })

    const pwdError = validatePassword(password)
    if (pwdError) {
      dispatch({ type: 'SET_ERROR', error: pwdError })
      dispatch({ type: 'SET_LOADING', loading: false })
      return
    }

    try {
      // Check if username is already taken
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUsername } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .limit(1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((existingUsername as any[] | null)?.[0]) {
        dispatch({ type: 'SET_ERROR', error: 'This username is already taken. Please choose another one.' })
        dispatch({ type: 'SET_LOADING', loading: false })
        return
      }

      const signupPayload: Record<string, unknown> = {
        username: username.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role: isStudent ? 'student' : 'teacher',
      }

      if (isTeacher && schoolAction === 'create') {
        signupPayload.orgAction = 'create'
        signupPayload.orgName = schoolName.trim()
      } else {
        signupPayload.orgSlug = schoolSlug.trim()
      }

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        dispatch({ type: 'SET_ERROR', error: result.error || 'Failed to create account' })
        dispatch({ type: 'SET_LOADING', loading: false })
        return
      }

      // Sign in with the created account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })

      if (!signInError) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('profiles') as any)
            .upsert({
              id: user.id,
              username: username.trim().toLowerCase(),
              organization_id: result.organizationId || undefined,
            }, { onConflict: 'id' })
        }
        router.push(isStudent ? '/student' : '/teacher')
        router.refresh()
        return
      }

      dispatch({ type: 'SET_SUCCESS', message: 'Account created successfully! You can now sign in.' })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'An unexpected error occurred' })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }

  if (success) {
    return (
      <section className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Account created!</h1>
          <p className="mt-4 text-gray-600">{successMessage}</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block font-medium text-accent hover:text-accent"
          >
            Go to login
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/20 to-transparent" />

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="CSLearn" className="mx-auto h-36 w-auto mb-4" />
          <h1 className="text-gray-600 text-lg font-medium">Create your account</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? 'bg-accent text-white'
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div className={`h-0.5 w-8 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Role selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Who are you?</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('student')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left transition-all hover:border-accent hover:bg-accent-bg/50 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">I&apos;m a student</p>
                      <p className="text-sm text-gray-500">Join a school using your school code</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('teacher')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left transition-all hover:border-accent hover:bg-accent-bg/50 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">I&apos;m a teacher at a school</p>
                      <p className="text-sm text-gray-500">Join or create a school for your students</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('setup')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left transition-all hover:border-accent hover:bg-accent-bg/50 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">I&apos;m setting up a school</p>
                      <p className="text-sm text-gray-500">Create a new school for teachers and students</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: School info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isStudent ? 'Join your school' : 'School information'}
              </h2>
              <p className="text-sm text-gray-500">
                {isStudent
                  ? 'Enter the school code provided by your teacher.'
                  : 'Create a new school or join an existing one.'}
              </p>

              {isTeacher ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SCHOOL_ACTION', action: 'create' })}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        schoolAction === 'create'
                          ? 'border-accent bg-accent-bg text-accent'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Create new school
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SCHOOL_ACTION', action: 'join' })}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        schoolAction === 'join'
                          ? 'border-accent bg-accent-bg text-accent'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Join existing school
                    </button>
                  </div>

                  {schoolAction === 'create' ? (
                    <div>
                      <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                        School name
                      </label>
                      <input
                        id="schoolName"
                        type="text"
                        required
                        value={schoolName}
                        onChange={(e) => dispatch({ type: 'SET_SCHOOL_NAME', name: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                        placeholder="e.g. Springfield High School"
                      />
                      {schoolName.trim() && (
                        <p className="mt-1 text-xs text-gray-500">
                          School code will be: <code className="bg-gray-100 px-1 rounded">{slugify(schoolName)}</code>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="schoolSlug" className="block text-sm font-medium text-gray-700">
                        School code
                      </label>
                      <input
                        id="schoolSlug"
                        type="text"
                        required
                        value={schoolSlug}
                        onChange={(e) => dispatch({ type: 'SET_SCHOOL_SLUG', slug: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                        placeholder="e.g. springfield-high"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Ask your school administrator for the code
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="studentSlug" className="block text-sm font-medium text-gray-700">
                    School code
                  </label>
                  <input
                    id="studentSlug"
                    type="text"
                    required
                    value={schoolSlug}
                    onChange={(e) => dispatch({ type: 'SET_SCHOOL_SLUG', slug: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                    placeholder="e.g. springfield-high"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ask your teacher for the school code
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSchoolNext}
                className="w-full"
              >
                Continue
              </Button>

              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>
            </div>
          )}

          {/* Step 3: Personal details */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Your details</h2>

              <Input
                id="username"
                label="Username"
                value={username}
                onChange={(e) => dispatch({ type: 'SET_USERNAME', username: e.target.value })}
                placeholder={isStudent ? 'e.g. johndoe' : 'e.g. jdoe'}
                helperText="This will be your username to sign in"
                required
              />

              <Input
                id="fullName"
                label="Full name"
                value={fullName}
                onChange={(e) => dispatch({ type: 'SET_FULL_NAME', fullName: e.target.value })}
                placeholder="John Doe"
                required
              />

              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => dispatch({ type: 'SET_PASSWORD', password: e.target.value })}
                placeholder="••••••••"
                helperText="Minimum 8 characters, must include uppercase, lowercase, number, and special character"
                minLength={8}
                required
              />

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>
                      {password.length >= 8 ? '✓' : '○'} At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                      {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                      {/[0-9]/.test(password) ? '✓' : '○'} One number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                      {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} One special character
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                loadingText="Creating account..."
                className="w-full"
              >
                Create account
              </Button>

              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>
            </div>
          )}

          {step === 1 && (
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-accent hover:text-accent">
                Sign in
              </Link>
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
