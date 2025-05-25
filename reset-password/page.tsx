"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ResetPasswordPage() {
  // Estados - SIEMPRE definidos en el mismo orden
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Hooks de Next.js - SIEMPRE llamados incondicionalmente
  const router = useRouter()

  // Función para obtener el token - definida con useCallback para evitar recreaciones
  const getTokenFromUrl = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        return params.get("token")
      }
      return null
    } catch (err) {
      console.error("Error al obtener token:", err)
      return null
    }
  }, [])

  // useEffect para inicializar - SIEMPRE llamado incondicionalmente
  useEffect(() => {
    // Marcar como montado
    setMounted(true)

    // Obtener token
    const urlToken = getTokenFromUrl()
    setToken(urlToken)
  }, [getTokenFromUrl])

  // Función de envío del formulario - definida con useCallback
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validaciones
      if (!token) {
        setError("No se proporcionó un token válido")
        return
      }

      if (newPassword.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres")
        return
      }

      if (newPassword !== confirmPassword) {
        setError("Las contraseñas no coinciden")
        return
      }

      // Resetear estados
      setError("")
      setSuccess("")
      setIsLoading(true)

      try {
        const response = await fetch("/api/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            new_password: newPassword,
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (parseError) {
          throw new Error("Error al procesar la respuesta del servidor")
        }

        if (!response.ok) {
          throw new Error(data.error || "Error al restablecer la contraseña")
        }

        setSuccess("Contraseña restablecida con éxito")

        // Redireccionar después de un tiempo
        setTimeout(() => {
          try {
            router.push("/login")
          } catch (routeError) {
            window.location.href = "/login"
          }
        }, 2000)
      } catch (err: any) {
        setError(err.message || "Hubo un error al procesar tu solicitud")
      } finally {
        setIsLoading(false)
      }
    },
    [token, newPassword, confirmPassword, router],
  )

  // Renderizado condicional basado en el estado mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md p-8 text-center">
          <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  // Renderizado principal - SIEMPRE después de todos los hooks
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Restablecer contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu nueva contraseña para restablecer tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>¡Éxito!</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Ingresa tu nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirma tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !token}>
              {isLoading ? "Procesando..." : "Restablecer contraseña"}
            </Button>

            {!token && (
              <p className="text-sm text-red-500 text-center mt-2">
                No se ha detectado un token válido. Verifica el enlace o solicita uno nuevo.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
