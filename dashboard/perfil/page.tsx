"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2 } from "lucide-react"

interface UserProfile {
  id: number
  name: string
  email: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")

  // Obtener los datos del usuario al cargar la página
useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const user_id = Number(localStorage.getItem("user_id"))

      if (!user_id || isNaN(user_id)) {
        throw new Error("No se encontró el ID del usuario autenticado. Redirigiendo al inicio de sesión.")
      }

      // Hacer la solicitud al backend con el user_id
      const response = await fetch(`/api/users/${user_id}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No estás autenticado. Por favor, inicia sesión.")
        }
        throw new Error("Error al obtener los datos del usuario")
      }

      const userData = await response.json()
      setUser(userData)
      setError("")
    } catch (err: any) {
      console.error("Error fetching user profile:", err)
      setError(err.message || "Error al cargar los datos del usuario.")
      router.push("/login") // Redirigir al inicio de sesión si no está autenticado
    } finally {
      setLoading(false)
    }
  }

  fetchUserProfile()
}, [router])

const handleProfileUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!user) return;

  setUpdating(true);

  try {
    // Obtener el user_id desde localStorage
    const user_id = Number(localStorage.getItem("user_id"));

    if (!user_id || isNaN(user_id)) {
      throw new Error("No se encontró el ID del usuario autenticado.");
    }

    // Enviar los datos actualizados a la API
    const response = await fetch(`/api/users/${user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
      }),
    });

    if (!response.ok) {
      throw new Error("Error al actualizar el perfil");
    }

    // Mostrar mensaje de éxito
    setSuccessMessage("Perfil actualizado correctamente");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err: any) {
    console.error("Error updating profile:", err);
    setError("No se pudo actualizar el perfil. Inténtalo de nuevo más tarde.");
  } finally {
    setUpdating(false);
  }
};

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validar que las contraseñas coincidan
    if (password.new !== password.confirm) {
      setError("Las contraseñas nuevas no coinciden.")
      return
    }

    setUpdating(true)

    try {
      // Enviar la solicitud de cambio de contraseña a la API
      const response = await fetch(`/api/users/:user_id/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: password.current,
          new_password: password.new,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al cambiar la contraseña")
      }

      // Limpiar el formulario y mostrar mensaje de éxito
      setPassword({ current: "", new: "", confirm: "" })
      setSuccessMessage("Contraseña actualizada correctamente")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("Error updating password:", err)
      setError("No se pudo actualizar la contraseña. Verifica que la contraseña actual sea correcta.")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando perfil...</span>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>
          <p className="text-muted-foreground">Gestiona tu información personal y preferencias</p>
        </div>

        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>
        <p className="text-muted-foreground">Gestiona tu información personal y preferencias</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Información personal */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Información Personal</TabsTrigger>
          <TabsTrigger value="password">Contraseña</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tu información personal y de contacto</CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileUpdate}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={user?.name || ""}
                    onChange={(e) => setUser(user ? { ...user, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    onChange={(e) => setUser(user ? { ...user, email: e.target.value } : null)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? "Guardando..." : "Guardar cambios"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Cambio de contraseña */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña para mantener tu cuenta segura</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordUpdate}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}