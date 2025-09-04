"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useFormValidation } from "@/lib/client-validation"
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"

function ForgotPasswordPageContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState("")

  const { values, errors, warnings, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    email: string
  }>(
    {
      email: "",
    },
    {
      email: [
        {
          validate: (value: unknown) => Boolean((value as string)?.trim()),
          message: "Email address is required"
        },
        {
          validate: (value: unknown) => {
            const email = (value as string).trim()
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
            return emailRegex.test(email)
          },
          message: "Please enter a valid email address"
        },
      ],
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    setIsLoading(true)
    setError("")
    clearErrors()

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: values.email }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailSent(true)
      } else {
        setError(data.message || "Failed to send password reset email. Please try again.")
      }
    } catch (error) {
      console.error("Password reset request error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              
              <p className="text-gray-600 mb-6">
                We&apos;ve sent a password reset code to <span className="font-semibold text-gray-900">{values.email}</span>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Enter the 6-digit code on the next page</li>
                      <li>Create your new password</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(values.email)}`)}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Enter Reset Code
              </Button>
              
              <div className="mt-6 text-center">
                <Link 
                  href="/auth/login" 
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <Mail className="h-8 w-8 text-gray-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h2>
            
            <p className="text-gray-600">
              No worries! Enter your email address and we&apos;ll send you a code to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
              required
              disabled={isLoading}
              autoComplete="email"
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending Code...
                </div>
              ) : (
                "Send Reset Code"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ForgotPasswordPageContent />
    </Suspense>
  )
}
