"use client"

/**
 * Reusable form field components styled to a black-on-white palette.
 * Includes: FormField, PasswordField (with Eye/EyeOff toggle), FileField.
 */

import React from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormFieldProps {
  id: string
  name: string
  label: string
  type?: "text" | "email" | "password" | "tel" | "url"
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  warning?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  description?: string
  suggestions?: string[]
  className?: string
  inputClassName?: string
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  warning,
  required = false,
  disabled = false,
  autoComplete,
  description,
  suggestions = [],
  className,
  inputClassName,
}: FormFieldProps) {
  const hasError = Boolean(error)
  const hasWarning = Boolean(warning && !hasError)
  const hasSuccess = Boolean(value && !hasError && !hasWarning)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)
  const handleBlur = () => onBlur?.()

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className={cn("text-sm font-medium text-black", hasError && "text-red-700", hasWarning && "text-yellow-700")}
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>

      {description && (
        <p id={`${id}-description`} className="text-sm text-gray-700">
          {description}
        </p>
      )}

      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            // base black-on-white styling
            "pr-12 text-black placeholder:text-gray-500 bg-white border-gray-300 focus:border-black focus:ring-0",
            // validation accenting (kept minimal, still accessible)
            hasError && "border-red-300 focus:border-red-600",
            hasWarning && "border-yellow-300 focus:border-yellow-600",
            hasSuccess && "border-gray-400 focus:border-black",
            inputClassName,
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : hasWarning ? `${id}-warning` : description ? `${id}-description` : undefined
          }
        />

        {/* Status icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {hasError && <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />}
          {hasWarning && <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden="true" />}
          {hasSuccess && <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />}
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <div id={`${id}-error`} className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-red-700">{error}</p>
            {suggestions.length > 0 && (
              <ul className="text-xs text-red-600 space-y-1 ml-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-400">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Warning message */}
      {hasWarning && (
        <div id={`${id}-warning`} className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-700">{warning}</p>
        </div>
      )}
    </div>
  )
}

export interface PasswordFieldProps extends Omit<FormFieldProps, "type"> {
  showStrength?: boolean
  confirmValue?: string
}

export function PasswordField({ showStrength = false, confirmValue, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" }
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[@$!%*?&]/.test(password)) score++

    // grayscale to black to match palette
    const labels = ["", "Very weak", "Weak", "Fair", "Good", "Strong"]
    const colors = ["", "bg-gray-300", "bg-gray-400", "bg-gray-500", "bg-gray-700", "bg-black"]
    return { score, label: labels[score], color: colors[score] }
  }

  const strength = showStrength ? getPasswordStrength(props.value) : null

  return (
    <div className="space-y-2">
      <div className="relative">
        <FormField
          {...props}
          type={showPassword ? "text" : "password"}
          inputClassName={cn("pr-12", props.inputClassName)}
        />

        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className="absolute inset-y-0 right-2 my-auto h-8 w-8 flex items-center justify-center rounded-md text-gray-700 hover:text-black hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </button>
      </div>

      {showStrength && strength && strength.score > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all duration-300", strength.color)}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-700 min-w-16">{strength.label}</span>
          </div>
        </div>
      )}

      {confirmValue !== undefined && props.value && confirmValue && props.value !== confirmValue && (
        <p className="text-sm text-red-700 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Passwords do not match
        </p>
      )}
    </div>
  )
}

export interface FileFieldProps {
  id: string
  name: string
  label: string
  accept?: string
  maxSize?: number // MB
  value?: File | null
  onChange: (file: File | null) => void
  error?: string
  disabled?: boolean
  description?: string
  preview?: string
  className?: string
}

export function FileField({
  id,
  name,
  label,
  accept = "image/*",
  maxSize = 5,
  value,
  onChange,
  error,
  disabled = false,
  description,
  preview,
  className,
}: FileFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const hasError = Boolean(error)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange(file)
  }

  const handleClick = () => fileInputRef.current?.click()

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className={cn("text-sm font-medium text-black", hasError && "text-red-700")}>
        {label}
      </Label>

      {description && <p className="text-sm text-gray-700">{description}</p>}

      <div className="space-y-3">
        {preview && (
          <div className="flex justify-center">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200">
              <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" sizes="96px" />
            </div>
          </div>
        )}

        <div
          onClick={handleClick}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            hasError ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400 bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <input
            ref={fileInputRef}
            id={id}
            name={name}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="text-gray-700">
              {value ? (
                <div className="space-y-1">
                  <p className="font-medium">{value.name}</p>
                  <p className="text-sm">{formatFileSize(value.size)}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p>Click to upload a file</p>
                  <p className="text-sm">Maximum size: {maxSize}MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Remove file
          </button>
        )}
      </div>

      {hasError && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
