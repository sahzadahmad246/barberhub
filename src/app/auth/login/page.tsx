"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { FormField, PasswordField } from "@/components/ui/form-field"
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton"
import { useAuth } from "@/lib/auth-client"
import { useFormValidation, validationRuleSets } from "@/lib/client-validation"
import { getErrorMessage, getErrorSuggestions } from "@/lib/error-messages"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()

  const { values, errors, warnings, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    email: string
    password: string
  }>(
    {
      email: "",
      password: "",
    },
    validationRuleSets.login as Record<"email" | "password", import("@/lib/client-validation").ValidationRule[]>,
  )

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState("")

  // Get messages from URL params
  const urlMessage = searchParams.get("message")
  const urlError = searchParams.get("error")

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const callbackUrl = searchParams.get("callbackUrl") || "/profile"
      router.push(callbackUrl)
    }
  }, [isAuthenticated, router, searchParams])

  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    setIsLoading(true)
    setApiError("")
    setShowEmailVerificationPrompt(false)
    clearErrors()

    try {
      // Use NextAuth signIn with credentials provider
      const result = await signIn("credentials", {
        email: values.email.toLowerCase().trim(),
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        // Handle specific error cases with user-friendly messages
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setShowEmailVerificationPrompt(true)
          setUnverifiedEmail(values.email)
          setApiError(getErrorMessage("EMAIL_NOT_VERIFIED", "login"))
        } else {
          const errorMessage = getErrorMessage(result.error, "login")
          setApiError(errorMessage)
        }
      } else if (result?.ok) {
        // Successful login - redirect to profile or intended page
        const callbackUrl = searchParams.get("callbackUrl") || "/profile"
        router.push(callbackUrl)
      }
    } catch (error) {
      console.error("Login error:", error)
      setApiError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setApiError("Verification email sent! Please check your inbox and click the verification link.")
        setShowEmailVerificationPrompt(false)
      } else {
        setApiError(data.message || "Failed to send verification email.")
      }
    } catch (error) {
      console.error("Resend verification error:", error)
      setApiError("Failed to send verification email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-700">Welcome back to Barber Hub</p>
        </div>

        <div className="mt-8 space-y-6">
          {/* URL Messages */}
          {urlMessage && (
            <div className="rounded-md bg-gray-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-black">{urlMessage}</p>
                </div>
              </div>
            </div>
          )}

          {urlError && (
            <div className="rounded-md bg-gray-100 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-black">{urlError}</p>
                </div>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className={`rounded-md p-4 ${showEmailVerificationPrompt ? "bg-gray-100" : "bg-gray-100"}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 text-black`} viewBox="0 0 20 20" fill="currentColor">
                    {showEmailVerificationPrompt ? (
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium text-black`}>{apiError}</p>
                  {showEmailVerificationPrompt && (
                    <div className="mt-2">
                      <button
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        className="text-sm font-medium text-black underline hover:text-gray-700 disabled:opacity-50"
                      >
                        {isLoading ? "Sending..." : "Resend verification email"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          <div>
            <GoogleOAuthButton
              text="Continue with Google"
              callbackUrl={searchParams.get("callbackUrl") || "/profile"}
              disabled={isLoading}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-400" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-black">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <FormField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                value={values.email}
                onChange={(value) => handleChange("email", value as string)}
                onBlur={() => handleBlur("email")}
                error={touched.email ? errors.email : undefined}
                warning={touched.email ? warnings.email : undefined}
                suggestions={touched.email && errors.email ? getErrorSuggestions("INVALID_EMAIL") : []}
                required
                disabled={isLoading}
                autoComplete="email"
              />

              {/* Password Field */}
              <PasswordField
                id="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                value={values.password}
                onChange={(value) => handleChange("password", value as string)}
                onBlur={() => handleBlur("password")}
                error={touched.password ? errors.password : undefined}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-700">
                Don&apos;t have an account?{" "}
                <Link href="/auth/register" className="font-medium text-black hover:text-gray-700">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
