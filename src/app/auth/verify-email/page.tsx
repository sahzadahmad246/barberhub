"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useFormValidation } from "@/lib/client-validation"
import { ArrowLeft, CheckCircle, AlertCircle, Shield } from "lucide-react"

function VerifyEmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  const { values, errors, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    otp: string
  }>(
    {
      otp: "",
    },
    {
      otp: [
        {
          validate: (value: unknown) => Boolean((value as string)?.trim()),
          message: "Verification code is required"
        },
        {
          validate: (value: unknown) => (value as string).length === 6,
          message: "Verification code must be 6 digits"
        },
      ],
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Verification Link</h2>
              <p className="text-gray-600 mb-6">This email verification link is invalid.</p>
              
              <Link 
                href="/auth/login" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    setIsLoading(true)
    setError("")
    setMessage("")
    clearErrors()

    try {
      const response = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: values.otp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Email verified successfully! You now have full access to your account.")
        setTimeout(() => {
          router.push("/dashboard?message=Email verified successfully")
        }, 2000)
      } else {
        setError(data.message || "Failed to verify email. Please try again.")
      }
    } catch (error) {
      console.error("Email verification error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsResending(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Verification code sent! Please check your email.")
      } else {
        setError(data.message || "Failed to send verification code. Please try again.")
      }
    } catch (error) {
      console.error("Resend OTP error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h2>
            
            <p className="text-gray-600">
              Enter the verification code sent to <span className="font-semibold text-gray-900">{email}</span>
            </p>
          </div>

          {/* Success Message */}
          {message && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Success!</p>
                  <p>{message}</p>
                </div>
              </div>
            </div>
          )}

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

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={values.otp}
                onChange={(e) => handleChange("otp", e.target.value)}
                onBlur={() => handleBlur("otp")}
                maxLength={6}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  touched.otp && errors.otp
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {touched.otp && errors.otp && (
                <p className="mt-1 text-sm text-red-600">{errors.otp}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn&apos;t receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={isResending}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? "Sending..." : "Resend verification code"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Skip for now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailPageContent />
    </Suspense>
  )
}
