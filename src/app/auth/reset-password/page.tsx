"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useFormValidation } from "@/lib/client-validation"
import { Shield, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  const { values, errors, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
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
          message: "Verification code is required"
        },
        {
          validate: (value: unknown) => (value as string).length === 6,
          message: "Verification code must be 6 digits"
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
        {
          validate: (value: unknown) => /[a-z]/.test(value as string),
          message: "Password must contain at least one lowercase letter"
        },
        {
          validate: (value: unknown) => /[A-Z]/.test(value as string),
          message: "Password must contain at least one uppercase letter"
        },
        {
          validate: (value: unknown) => /\d/.test(value as string),
          message: "Password must contain at least one number"
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
              
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reset Your Password
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

          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* OTP Field */}
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

              {/* New Password Field */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={values.newPassword}
                    onChange={(e) => handleChange("newPassword", e.target.value)}
                    onBlur={() => handleBlur("newPassword")}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      touched.newPassword && errors.newPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {touched.newPassword && errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={values.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      touched.confirmPassword && errors.confirmPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
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
                  Resetting Password...
                </div>
              ) : (
                "Reset Password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
