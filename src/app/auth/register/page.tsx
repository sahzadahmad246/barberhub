"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FormField, PasswordField } from "@/components/ui/form-field"
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton"
import { useAuth } from "@/lib/auth-client"
import { useFormValidation, validationRuleSets, getApiErrorMessage } from "@/lib/client-validation"
import { getErrorSuggestions } from "@/lib/error-messages"

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const { values, errors, warnings, touched, handleChange, handleBlur, validateAll, clearErrors } = useFormValidation<{
    name: string
    email: string
    password: string
    confirmPassword: string
  }>(
    {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationRuleSets.registration as Record<
      "name" | "email" | "password" | "confirmPassword",
      import("@/lib/client-validation").ValidationRule[]
    >,
  )

  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [apiError, setApiError] = useState("")
  const [otpStep, setOtpStep] = useState<{ active: boolean; email: string; name: string } | null>(null)
  const [otp, setOtp] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push("/profile")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAll()) {
      return
    }

    setIsLoading(true)
    setApiError("")
    setSuccessMessage("")
    clearErrors()

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.toLowerCase().trim(),
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage("We sent a 6-digit code to your email. Enter it below to verify.")
        setOtpStep({ active: true, email: values.email.toLowerCase().trim(), name: values.name.trim() })
      } else {
        // Handle API errors with user-friendly messages
        const errorMessage = getApiErrorMessage(data.error || data)
        setApiError(errorMessage)
      }
    } catch (error) {
      console.error("Registration error:", error)
      setApiError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpStep?.active || otp.trim().length !== 6) return
    setIsVerifying(true)
    setApiError("")
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpStep.email, otp: otp.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMessage("Your email is verified and account created. Redirecting to profile...")
        setTimeout(() => {
          router.push("/profile")
        }, 1000)
      } else {
        const errorMessage = getApiErrorMessage(data.error || data) || "Invalid or expired code."
        setApiError(errorMessage)
      }
    } catch {
      setApiError("Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    if (!otpStep?.email || resendCooldown > 0) return
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpStep.email, name: otpStep.name }),
      })
      if (res.ok) {
        setSuccessMessage("A new code has been sent to your email.")
        setResendCooldown(30)
        const timer = setInterval(() => {
          setResendCooldown((c) => {
            if (c <= 1) {
              clearInterval(timer)
              return 0
            }
            return c - 1
          })
          return undefined as unknown as number // satisfy TS for setInterval typing in certain envs
        }, 1000)
      } else {
        const data = await res.json()
        setApiError(getApiErrorMessage(data.error || data) || "Failed to resend code")
      }
    } catch {
      setApiError("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-700">Join Barber Hub today</p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="rounded-md bg-gray-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-black">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
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
                  <p className="text-sm font-medium text-black">{apiError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          <div>
            <GoogleOAuthButton text="Continue with Google" callbackUrl="/profile" disabled={isLoading} />
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

          {/* Registration Form */}
          {!otpStep?.active && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Name Field */}
                <FormField
                  id="name"
                  name="name"
                  label="Full Name"
                  type="text"
                  placeholder="Enter your full name"
                  value={values.name}
                  onChange={(value) => handleChange("name", value as string)}
                  onBlur={() => handleBlur("name")}
                  error={touched.name ? errors.name : undefined}
                  warning={touched.name ? warnings.name : undefined}
                  suggestions={touched.name && errors.name ? getErrorSuggestions("VALIDATION_ERROR") : []}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  description="Your full name as you'd like it to appear on your profile"
                />

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
                  description="We'll send you a verification link at this email address"
                />

                {/* Password Field */}
                <PasswordField
                  id="password"
                  name="password"
                  label="Password"
                  placeholder="Create a strong password"
                  value={values.password}
                  onChange={(value) => handleChange("password", value as string)}
                  onBlur={() => handleBlur("password")}
                  error={touched.password ? errors.password : undefined}
                  warning={touched.password ? warnings.password : undefined}
                  suggestions={touched.password && errors.password ? getErrorSuggestions("WEAK_PASSWORD") : []}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  showStrength={true}
                  description="Must be at least 8 characters with uppercase, lowercase, numbers, and special characters"
                />

                {/* Confirm Password Field */}
                <PasswordField
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={values.confirmPassword}
                  onChange={(value) => handleChange("confirmPassword", value as string)}
                  onBlur={() => handleBlur("confirmPassword")}
                  error={touched.confirmPassword ? errors.confirmPassword : undefined}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  confirmValue={values.password}
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
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-700">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-medium text-black hover:text-gray-700">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          )}

          {otpStep?.active && (
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
              <div className="space-y-4">
                <FormField
                  id="otp"
                  name="otp"
                  label="Enter 6-digit code"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))}
                  onBlur={() => undefined}
                  required
                  disabled={isVerifying}
                  description={`We sent the code to ${otpStep.email}`}
                />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  disabled={isVerifying || resendCooldown > 0}
                  onClick={handleResendOtp}
                  variant="secondary"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
