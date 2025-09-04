"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/auth/AuthGuard"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Shield, Building2, Camera, Check, X, AlertCircle, Upload } from "lucide-react"
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner"

interface UserProfile {
  id: string
  name: string
  email: string
  profilePicture?: {
    url: string
    publicId: string
  }
  emailVerified: boolean
  role: "user" | "staff" | "owner" | "admin"
  salonId?: string
  provider: "email" | "google"
  createdAt: string
  updatedAt: string
}

function ProfileContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  // Fetch profile data
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfile()
    }
  }, [isAuthenticated, user])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth/profile")
      const result = await response.json()

      if (result.success) {
        setProfile(result.data)
        setFormData({
          name: result.data.name,
          email: result.data.email,
        })
      } else {
        setError(result.error?.message || "Failed to fetch profile")
      }
    } catch (err) {
      setError("Failed to fetch profile")
      console.error("Profile fetch error:", err)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        setProfile(result.data)
        setSuccess("Profile updated successfully")
        setIsEditing(false)
      } else {
        setError(result.error?.message || "Failed to update profile")
      }
    } catch (err) {
      setError("Failed to update profile")
      console.error("Profile update error:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload image
    handleImageUpload(file)
  }

  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("profilePicture", file)

      const response = await fetch("/api/auth/profile/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                profilePicture: result.data.profilePicture,
              }
            : null,
        )
        setSuccess("Profile picture updated successfully")
        setPreviewImage(null)
      } else {
        setError(result.error?.message || "Failed to upload image")
        setPreviewImage(null)
      }
    } catch (err) {
      setError("Failed to upload image")
      setPreviewImage(null)
      console.error("Image upload error:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "owner":
        return "default"
      case "staff":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
             
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      {/* Email Verification Banner */}
      {!profile.emailVerified && (
        <EmailVerificationBanner email={profile.email} />
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Picture Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Profile Picture
            </CardTitle>
            <CardDescription>Upload a profile picture to personalize your account</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={previewImage || profile.profilePicture?.url} alt={profile.name} />
                <AvatarFallback className="text-lg">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Change Picture"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">JPG, PNG or GIF. Max size 5MB.</p>
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your personal account details</CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    size="sm"
                    className="bg-black text-white hover:bg-gray-900"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        name: profile.name,
                        email: profile.email,
                      })
                      setError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{profile.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.emailVerified ? (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                        <X className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleColor(profile.role)} className="text-xs capitalize">
                        {profile.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {profile.salonId && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Salon Association</p>
                      <p className="text-sm text-muted-foreground">ID: {profile.salonId}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Account created: {new Date(profile.createdAt).toLocaleDateString()}</span>
                    <span>Provider: {profile.provider}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
