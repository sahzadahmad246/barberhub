"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FormField, PasswordField } from "@/components/ui/form-field"
import { useFormValidation } from "@/lib/client-validation"

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  const { values, errors, warnings, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    otp: string
    newPassword: string
    confirmPassword: string
  }>(
    {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
    {
      otp: [
        {
          validate: (value: unknown) => Boolean((value as string)?.trim()),
          message: "OTP is required"
        },
        {
          validate: (value: unknown) => (value as string).length === 6,
          message: "OTP must be 6 digits"
        },
      ],
      newPassword: [
        {
          validate: (value: unknown) => Boolean(value),
          message: "New password is required"
        },
        {
          validate: (value: unknown) => (value as string).length >= 8,
          message: "Password must be at least 8 characters"
        },
      ],
      confirmPassword: [
        {
          validate: (value: unknown) => Boolean(value),
          message: "Please confirm your password"
        },
        {
          validate: (value: unknown, allValues) => (value as string) === (allValues?.newPassword as string),
          message: "Passwords do not match",
        },
      ],
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Invalid Reset Link</h2>
            <p className="mt-2 text-gray-600">This password reset link is invalid or has expired.</p>
            <Link href="/auth/login" className="mt-4 inline-block text-black hover:text-gray-700 underline">
              Return to Login
            </Link>
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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: values.otp,
          newPassword: values.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Password reset successfully! You can now login with your new password.")
        setTimeout(() => {
          router.push("/auth/login?message=Password reset successfully")
        }, 2000)
      } else {
        setError(data.message || "Failed to reset password. Please try again.")
      }
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">Reset Your Password</h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            Enter the verification code sent to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Success Message */}
          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* OTP Field */}
              <FormField
                id="otp"
                name="otp"
                label="Verification Code"
                type="text"
                placeholder="Enter 6-digit code"
                value={values.otp}
                onChange={(value) => handleChange("otp", value as string)}
                onBlur={() => handleBlur("otp")}
                error={touched.otp ? errors.otp : undefined}
                warning={touched.otp ? warnings.otp : undefined}
                required
                disabled={isLoading}
              />

              {/* New Password Field */}
              <PasswordField
                id="newPassword"
                name="newPassword"
                label="New Password"
                placeholder="Enter your new password"
                value={values.newPassword}
                onChange={(value) => handleChange("newPassword", value as string)}
                onBlur={() => handleBlur("newPassword")}
                error={touched.newPassword ? errors.newPassword : undefined}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />

              {/* Confirm Password Field */}
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm New Password"
                placeholder="Confirm your new password"
                value={values.confirmPassword}
                onChange={(value) => handleChange("confirmPassword", value as string)}
                onBlur={() => handleBlur("confirmPassword")}
                error={touched.confirmPassword ? errors.confirmPassword : undefined}
                required
                disabled={isLoading}
                autoComplete="new-password"
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
                    Resetting Password...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>

            {/* Back to Login Link */}
            <div className="text-center">
              <Link href="/auth/login" className="text-sm font-medium text-black hover:text-gray-700 underline">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
